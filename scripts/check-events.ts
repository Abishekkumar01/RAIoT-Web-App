
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getAdminDb } from '@/lib/firebase-admin';

console.log("STARTING SCRIPT...");

async function checkEvents() {
    try {
        console.log("Getting DB...");
        const db = getAdminDb();
        if (!db) {
            console.error('Failed to initialize Admin DB');
            return;
        }

        console.log("Querying events collection...");
        const eventsRef = db.collection('events');
        const snapshot = await eventsRef.get();

        console.log(`Snapshot size: ${snapshot.size}`);

        if (snapshot.empty) {
            console.log('No matching documents found in "events".');
            return;
        }

        snapshot.forEach(doc => {
            console.log('FOUND EVENT:', doc.id, doc.data().title);
        });
    } catch (e) {
        console.error("ERROR in script:", e);
    }
}

checkEvents().then(() => console.log("Done."));

