/*
  Reassign a single exam submission to another user.

  Usage:
    node scripts/reassign-exam-submission.js discover --name "Sandeep" --fromEmail "amanchoudhary.1502@gmail.com"
    node scripts/reassign-exam-submission.js reassign --submissionId "<submissionId>" --toUid "<targetUid>"

  Optional flags:
    --fromUid "<uid>"
    --fromEmail "<email>"
    --score "23.13"
    --testId "<examId>"
*/

const path = require('path');
const dotenv = require('dotenv');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function normalizePrivateKey(raw) {
  if (!raw) return undefined;
  let key = raw;
  try {
    const asJson = JSON.parse(raw);
    if (asJson && asJson.private_key) {
      key = asJson.private_key;
    }
  } catch (_) {
    // not json, continue
  }

  if (key && !key.includes('-----BEGIN PRIVATE KEY-----')) {
    try {
      const decoded = Buffer.from(key, 'base64').toString('utf8');
      if (decoded.includes('-----BEGIN PRIVATE KEY-----')) {
        key = decoded;
      }
    } catch (_) {
      // not base64, continue
    }
  }

  return key.replace(/^['"]|['"]$/g, '').replace(/\\n/g, '\n');
}

function initDb() {
  if (!getApps().length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey })
      });
    } else {
      initializeApp();
    }
  }
  return getFirestore();
}

async function findUsers(db, nameOrEmail) {
  const snap = await db.collection('users').get();
  const needle = String(nameOrEmail || '').trim().toLowerCase();
  return snap.docs
    .map((doc) => {
      const data = doc.data() || {};
      const displayName = data.displayName || data.name || data.profileData?.name || '';
      const email = data.email || '';
      const role = data.role || '';
      return { uid: doc.id, displayName, email, role };
    })
    .filter((u) => {
      if (!needle) return true;
      return u.uid.toLowerCase() === needle
        || u.email.toLowerCase().includes(needle)
        || String(u.displayName).toLowerCase().includes(needle);
    });
}

async function getUserProfile(db, uid) {
  const userDoc = await db.collection('users').doc(uid).get();
  const userData = userDoc.data() || {};
  return {
    uid,
    displayName: userData.displayName || userData.name || userData.profileData?.name || 'Unknown User',
    email: userData.email || '',
    role: userData.role || 'guest'
  };
}

async function archiveSubmission(db, submissionDoc, reason, replacedByUid) {
  const data = submissionDoc.data() || {};
  await db.collection('deletedExamSubmissions').add({
    ...data,
    originalSubmissionId: submissionDoc.id,
    deletedAt: new Date().toISOString(),
    deletedBy: 'script',
    deletionReason: reason,
    replacedByUid: replacedByUid || null,
  });
  await submissionDoc.ref.delete();
}

async function discover(db) {
  const name = getArg('name');
  const fromEmail = getArg('fromEmail');
  const fromUid = getArg('fromUid');
  const testId = getArg('testId');
  const score = getArg('score');

  const matchedUsers = await findUsers(db, name || '');
  console.log('Matched users (target candidates):');
  for (const user of matchedUsers) {
    console.log(`- uid=${user.uid} name=${user.displayName || '-'} email=${user.email || '-'} role=${user.role || '-'}`);
  }

  let sourceUid = fromUid;
  if (!sourceUid && fromEmail) {
    const sourceByEmail = await findUsers(db, fromEmail);
    if (sourceByEmail.length === 1) {
      sourceUid = sourceByEmail[0].uid;
      console.log(`\nResolved source uid from email: ${sourceUid}`);
    } else {
      console.log('\nCould not resolve a unique source uid from email.');
    }
  }

  let query = db.collection('examSubmissions');
  if (sourceUid) query = query.where('userId', '==', sourceUid);
  if (testId) query = query.where('testId', '==', testId);

  const subsSnap = await query.get();
  const candidates = subsSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((s) => {
      if (!score) return true;
      const val = Number(s.score ?? s.finalScore ?? 0);
      return Math.abs(val - Number(score)) < 0.0001;
    });

  console.log(`\nCandidate submissions: ${candidates.length}`);
  for (const s of candidates) {
    console.log(`- submissionId=${s.id} testId=${s.testId} userId=${s.userId} score=${s.score ?? '-'} submittedAt=${s.submittedAt ?? '-'}`);
  }
}

async function reassign(db) {
  const submissionId = getArg('submissionId');
  const toUid = getArg('toUid');
  const toEmail = getArg('toEmail');
  const toName = getArg('toName');
  const fromUid = getArg('fromUid');
  const replace = process.argv.includes('--replace');

  if (!submissionId) {
    throw new Error('Missing --submissionId');
  }

  let targetUid = toUid;
  if (!targetUid && (toEmail || toName)) {
    const matches = await findUsers(db, toEmail || toName);
    if (matches.length !== 1) {
      throw new Error(`Target user is not unique. Matches=${matches.length}`);
    }
    targetUid = matches[0].uid;
  }

  if (!targetUid) {
    throw new Error('Missing target user. Provide --toUid or unique --toEmail/--toName');
  }

  const targetProfile = await getUserProfile(db, targetUid);

  const submissionRef = db.collection('examSubmissions').doc(submissionId);
  const submissionDoc = await submissionRef.get();
  if (!submissionDoc.exists) {
    throw new Error('Submission not found');
  }

  const submission = submissionDoc.data() || {};
  if (fromUid && String(submission.userId) !== String(fromUid)) {
    throw new Error(`Submission userId mismatch. Expected ${fromUid}, found ${submission.userId}`);
  }

  const duplicateSnap = await db.collection('examSubmissions')
    .where('testId', '==', submission.testId)
    .where('userId', '==', targetUid)
    .get();

  const duplicateDocs = duplicateSnap.docs.filter((d) => d.id !== submissionId);
  if (duplicateDocs.length > 0 && !replace) {
    throw new Error(`Target user already has a submission for this test (testId=${submission.testId}). Use --replace to archive the duplicate and continue.`);
  }

  if (duplicateDocs.length > 0 && replace) {
    for (const duplicateDoc of duplicateDocs) {
      await archiveSubmission(db, duplicateDoc, `Replaced by reassigned submission ${submissionId}`, targetUid);
      console.log(`Archived duplicate submission ${duplicateDoc.id} for target uid ${targetUid}`);
    }
  }

  await submissionRef.update({
    userId: targetUid,
    userName: targetProfile.displayName,
    userEmail: targetProfile.email,
    userRole: targetProfile.role,
    updatedAt: new Date().toISOString(),
    reassignedByScriptAt: new Date().toISOString(),
    reassignedFromUserId: String(submission.userId || ''),
    reassignedToUserId: targetUid,
    reassignedToUserName: targetProfile.displayName,
    reassignedToUserEmail: targetProfile.email,
    reassignedToUserRole: targetProfile.role,
  });

  console.log(`Reassigned submission ${submissionId} from ${submission.userId} to ${targetUid}`);
}

async function inspect(db) {
  const submissionIds = [];
  for (let i = 0; i < process.argv.length; i += 1) {
    if (process.argv[i] === '--submissionId' && process.argv[i + 1]) {
      submissionIds.push(process.argv[i + 1]);
    }
  }

  if (submissionIds.length === 0) {
    throw new Error('Provide at least one --submissionId for inspect mode');
  }

  for (const submissionId of submissionIds) {
    const doc = await db.collection('examSubmissions').doc(submissionId).get();
    if (!doc.exists) {
      console.log(`- submissionId=${submissionId} not found`);
      continue;
    }

    const data = doc.data() || {};
    const answers = data.answers && typeof data.answers === 'object' ? data.answers : {};
    const manualGrades = data.manualGrades && typeof data.manualGrades === 'object' ? data.manualGrades : {};
    const attemptedAnswers = Object.values(answers).filter((value) => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim().length > 0;
      return value !== undefined && value !== null;
    }).length;

    console.log(`\n--- submissionId=${submissionId}`);
    console.log({
      testId: data.testId || null,
      userId: data.userId || null,
      submittedAt: data.submittedAt || null,
      updatedAt: data.updatedAt || null,
      score: data.score ?? null,
      requiresManualReview: data.requiresManualReview ?? null,
      manualReviewedAt: data.manualReviewedAt || null,
      answerKeys: Object.keys(answers).length,
      attemptedAnswers,
      manualGrades: Object.keys(manualGrades).length,
      hasAnswersObject: !!data.answers,
      hasManualReviewRequired: Array.isArray(data.manualReviewRequired) && data.manualReviewRequired.length > 0,
    });
  }
}

async function main() {
  const mode = process.argv[2];
  if (!mode || !['discover', 'reassign', 'inspect'].includes(mode)) {
    console.log('Mode required: discover | reassign | inspect');
    process.exit(1);
  }

  const db = initDb();
  if (mode === 'discover') {
    await discover(db);
  } else if (mode === 'inspect') {
    await inspect(db);
  } else {
    await reassign(db);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
