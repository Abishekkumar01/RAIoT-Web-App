import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

export async function GET() {
    try {
        console.log("Starting float cleanup...");
        const snapshot = await getDocs(collection(db, "inventory"));
        let fixedCount = 0;

        for (const document of snapshot.docs) {
            const data = document.data();
            let needsUpdate = false;
            let updates: any = {};

            if (data.quantity && !Number.isInteger(data.quantity)) {
                updates.quantity = Math.round(data.quantity);
                needsUpdate = true;
            }

            if (data.availableQuantity && !Number.isInteger(data.availableQuantity)) {
                updates.availableQuantity = Math.round(data.availableQuantity);
                needsUpdate = true;
            }

            if (needsUpdate) {
                console.log(`Fixing component ${document.id} (${data.name})`, updates);
                await updateDoc(doc(db, "inventory", document.id), updates);
                fixedCount++;
            }
        }

        return NextResponse.json({ success: true, fixed: fixedCount });
    } catch (error: any) {
        console.error("Cleanup error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
