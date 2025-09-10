
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Hardcoded credentials for testing purposes
const MOCK_NALO_CREDENTIALS = {
    merchant_id: "NPS_000363",
    username: "david_gen",
    password_md5: crypto.createHash('md5').update("RveMxX9MN8JVM6d").digest('hex'),
    // Use the static key provided by the user
    key: "kqPS9?msJ_IbPB9" 
};

export async function POST(request: Request) {
  try {
    const { order_id, customerName, amount, item_desc, customerNumber, payby } = await request.json();

    if (!order_id || !customerName || !amount || !item_desc || !customerNumber || !payby) {
        return NextResponse.json({ error: 'Missing required Nalo payment fields' }, { status: 400 });
    }
    
    // The key is now static and part of the credentials object
    const key = MOCK_NALO_CREDENTIALS.key;
    const stringToHash = `${MOCK_NALO_CREDENTIALS.username}${key}${MOCK_NALO_CREDENTIALS.password_md5}`;
    const secrete = crypto.createHash('md5').update(stringToHash).digest('hex');

    const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/api/nalo-callback`;

    // Ensure customerNumber is a string prefixed with 233
    let formattedNumber = String(customerNumber);
    if (formattedNumber.startsWith('0')) {
        formattedNumber = '233' + formattedNumber.substring(1);
    } else if (!formattedNumber.startsWith('233')) {
        // Fallback for numbers without a leading 0, though less common
        formattedNumber = '233' + formattedNumber;
    }


    const naloPayload = {
        merchant_id: MOCK_NALO_CREDENTIALS.merchant_id,
        secrete,
        key, // Ensure the key is part of the payload
        order_id,
        customerName,
        amount: String(amount), // Ensure amount is a string
        item_desc,
        customerNumber: formattedNumber,
        payby,
        newVodaPayment: payby === 'VODAFONE' ? true : undefined,
        callback: callbackUrl,
    };
    
    console.log('Sending to Nalo:', JSON.stringify(naloPayload, null, 2));

    // Configure fetch to use a proxy if the environment variable is set
    const proxyUrl = process.env.HTTPS_PROXY_URL;
    const fetchOptions: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(naloPayload),
    };

    if (proxyUrl) {
      console.log(`Using proxy: ${proxyUrl}`);
      const agent = new HttpsProxyAgent(proxyUrl);
      // The type for `dispatcher` is not perfectly aligned in Next.js/node-fetch,
      // so we cast to `any` to avoid TypeScript errors.
      (fetchOptions as any).dispatcher = agent;
    }

    const naloResponse = await fetch('https://api.nalosolutions.com/payplus/api/', fetchOptions);

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

