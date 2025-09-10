
import { NextResponse } from 'next/server';
import { doc, updateDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received Nalo Callback:', body);

    const { Order_id, Status, InvoiceNo, Timestamp } = body;

    if (!Order_id || !Status) {
      return NextResponse.json({ Response: 'ERROR', Message: 'Missing Order_id or Status' }, { status: 400 });
    }
    
    // The Order_id from Nalo is our invoice ID
    const invoiceRef = doc(db, "invoices", Order_id);

    // Update the invoice status in Firestore
    await updateDoc(invoiceRef, {
        status: Status, // Can be "PAID", "FAILED", etc.
        naloInvoiceNo: InvoiceNo,
        naloStatusTimestamp: Timestamp
    });
    
    // Nalo expects a specific response to acknowledge receipt of the callback
    return NextResponse.json({ Response: "OK" }, { status: 200 });

  } catch (error) {
    console.error('Error processing Nalo callback:', error);
    return NextResponse.json({ Response: 'ERROR', Message: 'Internal Server Error' }, { status: 500 });
  }
}

    