
import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Hardcoded credentials for testing purposes
const MOCK_NALO_CREDENTIALS = {
    merchant_id: "NPS_000363",
    username: "david_gen",
    password_md5: crypto.createHash('md5').update("RveMxX9MN8JVM6d").digest('hex')
};

export async function POST(request: Request) {
  try {
    const { order_id, customerName, amount, item_desc, customerNumber, payby } = await request.json();

    if (!order_id || !customerName || !amount || !item_desc || !customerNumber || !payby) {
        return NextResponse.json({ error: 'Missing required Nalo payment fields' }, { status: 400 });
    }

    const key = Math.floor(1000 + Math.random() * 9000).toString(); // Random 4-digit key
    const stringToHash = `${MOCK_NALO_CREDENTIALS.username}${key}${MOCK_NALO_CREDENTIALS.password_md5}`;
    const secrete = crypto.createHash('md5').update(stringToHash).digest('hex');

    const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/api/nalo-callback`;

    const naloPayload = {
        merchant_id: MOCK_NALO_CREDENTIALS.merchant_id,
        secrete,
        key,
        order_id,
        customerName,
        amount: String(amount),
        item_desc,
        customerNumber,
        payby,
        newVodaPayment: payby === 'VODAFONE' ? true : undefined,
        callback: callbackUrl,
    };
    
    console.log('Sending to Nalo:', JSON.stringify(naloPayload, null, 2));

    const naloResponse = await fetch('https://api.nalosolutions.com/payplus/api/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(naloPayload),
    });

    const naloData = await naloResponse.json();
    console.log('Received from Nalo:', naloData);

    if (!naloResponse.ok || naloData.Status !== 'Accepted') {
      return NextResponse.json({ message: naloData.Description || 'Failed to initiate payment with Nalo' }, { status: naloResponse.status });
    }

    return NextResponse.json(naloData, { status: 200 });

  } catch (error) {
    console.error('Error initiating Nalo payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
