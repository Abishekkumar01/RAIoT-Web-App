import { NextResponse } from 'next/server';
import { getAdminDb, verifyUser } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const authUser = await verifyUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, requestedDays } = body;

    const days = Math.floor(Number(requestedDays));
    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required.' }, { status: 400 });
    }
    if (!days || days <= 0) {
      return NextResponse.json({ error: 'Requested days must be at least 1.' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin is not initialized.' }, { status: 500 });
    }

    await adminDb.runTransaction(async (tx) => {
      const reqRef = adminDb.collection('inventory_requests').doc(requestId);
      const reqSnap = await tx.get(reqRef);

      if (!reqSnap.exists) {
        throw new Error('Issuance request not found.');
      }

      const reqData = reqSnap.data() as any;

      if (reqData.userId !== authUser.uid) {
        throw new Error('You can only request extension for your own issuance.');
      }

      if (reqData.status !== 'approved') {
        throw new Error('Only approved issuances can be extended.');
      }

      if (reqData.extensionRequestStatus) {
        throw new Error('An extension request already exists for this issuance.');
      }

      const currentDays = Math.floor(Number(reqData.daysRequested || 0));
      const projectedDays = currentDays + days;

      if (projectedDays > 7) {
        throw new Error(`Extension exceeds limit. Current: ${currentDays} days, requested: ${days}, max: 7.`);
      }

      tx.update(reqRef, {
        extensionRequestedDays: days,
        extensionRequestStatus: 'pending',
        extensionRequestedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Request extension error:', error);
    return NextResponse.json({ error: error.message || 'Failed to request extension.' }, { status: 500 });
  }
}
