
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { msgid, status, reason, destination, statusdate, handlecharge, topupcharge } = body;

    if (!msgid) {
      return NextResponse.json({ error: 'Missing msgid' }, { status: 400 });
    }

    // Find the message in our database with the matching msgid
    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, where('msgid', '==', msgid));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.warn(`Received callback for unknown msgid: ${msgid}`);
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Update all matching documents (usually just one)
    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => {
      batch.update(doc.ref, {
        status: status,
        reason: reason,
        statusDate: statusdate,
        handleCharge: handlecharge,
        topupCharge: topupcharge,
      });
    });

    await batch.commit();
    
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Error in SMS callback:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
