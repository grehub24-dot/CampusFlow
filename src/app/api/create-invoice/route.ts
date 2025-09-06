
import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import type { Invoice } from '@/types';

// In-memory store for mock invoices. In a real app, use a database.
const mockInvoiceStore = new Map<string, { status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' }>();

export async function POST(request: Request) {
  try {
    const { amount, description, reference } = await request.json();

    if (!amount || !description || !reference) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // MOCK: Simulate calling a payment provider like Redde or Hubtel
    // In a real implementation, you would make an API call here.
    const mockInvoice: Invoice = {
      id: `inv_${uuid()}`,
      payToken: `token_${uuid()}`,
      amount,
      description,
      dialCode: '*170*1*1#', // Example dial code
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min expiry
    };

    // Store the mock invoice status for polling
    mockInvoiceStore.set(mockInvoice.id, { status: 'PENDING' });
    console.log(`Created mock invoice ${mockInvoice.id} with status PENDING.`);
    
    // Set a timeout to simulate payment success after a delay
    setTimeout(() => {
        const inv = mockInvoiceStore.get(mockInvoice.id);
        // Only update if it's still pending (hasn't been manually failed/expired)
        if(inv && inv.status === 'PENDING') {
            mockInvoiceStore.set(mockInvoice.id, { status: 'PAID' });
            console.log(`Mock invoice ${mockInvoice.id} status changed to PAID.`);
        }
    }, 20000); // 20 seconds delay


    return NextResponse.json(mockInvoice, { status: 200 });

  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Exporting the store so other mock routes can access it.
// This is NOT a pattern for production apps.
export { mockInvoiceStore };
