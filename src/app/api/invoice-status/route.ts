
import { NextResponse } from 'next/server';
import { mockInvoiceStore } from '../create-invoice/route';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
  }

  // MOCK: Fetch status from our in-memory store
  const invoice = mockInvoiceStore.get(id);

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }
  
  console.log(`Polling status for invoice ${id}: ${invoice.status}`);

  // Return the current status
  return NextResponse.json({ status: invoice.status }, { status: 200 });
}
