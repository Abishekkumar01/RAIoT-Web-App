
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Assumes existing service key

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function extendDeadlines() {
    const eventsRef = db.collection('events');
    const snapshot = await eventsRef.get();

    if (snapshot.empty) {
        console.log('No events found.');
        return;
    }

    const batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
        // Set deadline to 30 days from now
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);

        batch.update(doc.ref, {
            registrationDeadline: futureDate.toISOString()
        });
        count++;
    });

    await batch.commit();
    console.log(`Updated ${count} events with future deadlines.`);
}

extendDeadlines().catch(console.error);
