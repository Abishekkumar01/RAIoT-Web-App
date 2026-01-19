
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getAdminDb } from '@/lib/firebase-admin';

console.log("STARTING CREATE SCRIPT...");

async function createTestEvent() {
    try {
        const db = getAdminDb();
        if (!db) {
            console.error('Failed to initialize Admin DB');
            return;
        }

        const eventData = {
            title: "Test Event Recovery",
            description: "This is a test event to verify the system is working. You can delete this.",
            date: new Date().toISOString(),
            time: "10:00 AM",
            location: "Virtual",
            type: "Workshop",
            isOnline: true,
            maxParticipants: 100,
            registered: 0,
            imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80"
        };

        const res = await db.collection('events').add(eventData);
        console.error(`CREATED EVENT with ID: ${res.id}`); // Using error to ensure visibility
    } catch (e) {
        console.error("ERROR in create script:", e);
    }
}

createTestEvent().then(() => console.error("Create Script Done."));
