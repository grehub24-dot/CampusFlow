
import { NextResponse } from 'next/server';
import { doc, setDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { v4 as uuid } from 'uuid';
import type { Invoice } from '@/types';

export async function POST(request: Request) {
  try {
    const { amount, description, reference } = await request.json();

    if (!amount || !description || !reference) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const invoiceId = `inv_${uuid().substring(0, 8)}`;

    const mockInvoice: Invoice = {
      id: invoiceId,
      amount,
      description,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      reference,
    };

    // Store the invoice status in Firestore for polling
    const invoiceRef = doc(db, "invoices", invoiceId);
    await setDoc(invoiceRef, mockInvoice);
    console.log(`Created invoice ${invoiceId} with status PENDING.`);
    
    return NextResponse.json({ id: invoiceId, ...mockInvoice }, { status: 200 });

  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

    
