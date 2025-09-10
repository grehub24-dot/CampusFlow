
import { NextResponse } from 'next/server';
import { doc, getDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
  }

  try {
    const invoiceRef = doc(db, "invoices", id);
    const docSnap = await getDoc(invoiceRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    const invoiceData = docSnap.data();
    console.log(`Polling status for invoice ${id}: ${invoiceData.status}`);

    return NextResponse.json({ status: invoiceData.status }, { status: 200 });

  } catch (error) {
    console.error('Error fetching invoice status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

    