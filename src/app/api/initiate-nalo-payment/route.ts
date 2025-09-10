
import { NextResponse } from 'next/server';
import { HttpsProxyAgent } from 'https-proxy-agent';

export async function POST(request: Request) {
  try {
    const finalNaloPayload = await request.json();
    
    console.log('Received payload from client, forwarding to Nalo:', JSON.stringify(finalNaloPayload, null, 2));

    const proxyUrl = process.env.HTTPS_PROXY_URL;
    const fetchOptions: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalNaloPayload),
    };

    if (proxyUrl) {
      console.log(`Using proxy: ${proxyUrl}`);
      const agent = new HttpsProxyAgent(proxyUrl);
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
    console.error('Error in Nalo payment proxy:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
