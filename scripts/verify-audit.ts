
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getAdminDb } from '@/lib/firebase-admin';

console.log("STARTING AUDIT VERIFICATION...");

async function verifyAuditLogs() {
    try {
        const db = getAdminDb();
        if (!db) {
            console.error('Failed to initialize Admin DB');
            return;
        }

        console.log("Querying audit_logs collection...");
        const auditRef = db.collection('audit_logs').orderBy('timestamp', 'desc').limit(5);
        const snapshot = await auditRef.get();

        if (snapshot.empty) {
            console.log('No audit logs found yet (Expected if no deletions happened yet).');
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            console.log('AUDIT LOG FOUND:', {
                id: doc.id,
                action: data.action,
                user: data.userName,
                event: data.metadata?.eventTitle
            });
        });
    } catch (e) {
        console.error("ERROR in script:", e);
    }
}

verifyAuditLogs().then(() => console.log("Done."));
