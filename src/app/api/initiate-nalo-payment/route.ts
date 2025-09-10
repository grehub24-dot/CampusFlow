
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { HttpsProxyAgent } from 'https-proxy-agent';


export async function POST(request: Request) {
  try {
    const naloPayload = await request.json();

    // Basic validation to ensure we have a payload
    if (!naloPayload || !naloPayload.order_id) {
        return NextResponse.json({ error: 'Invalid payload received' }, { status: 400 });
    }
    
    console.log('Received payload from client, forwarding to Nalo:', JSON.stringify(naloPayload, null, 2));

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
