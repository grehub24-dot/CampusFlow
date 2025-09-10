
'use server';

import { NextResponse } from 'next/server';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { IntegrationSettings } from '@/types';
import crypto from 'crypto';

async function getNaloCredentials(): Promise<IntegrationSettings | null> {
  const settingsDocRef = doc(db, 'settings', 'integrations');
  const docSnap = await getDoc(settingsDocRef);

  if (docSnap.exists()) {
    return docSnap.data() as IntegrationSettings;
  }

  console.error('Nalo API settings are not configured.');
  return null;
}

export async function POST(request: Request) {
  try {
    const {
      order_id,
      customerName,
      amount,
      item_desc,
      customerNumber,
      payby,
    } = await request.json();

    const credentials = await getNaloCredentials();
    if (!credentials?.naloMerchantId || !credentials?.naloUsername) {
      return NextResponse.json(
        { error: 'Nalo credentials are not configured on the server.' },
        { status: 500 }
      );
    }
    
    // As per user instruction, use this static password for the secrete hash.
    const naloPassword = 'RveMxX9MN8JVM6d';

    /* 1. 4-digit key (doc: STRING(4)) -------------------- */
    const key = Math.floor(1000 + Math.random() * 9000).toString();

    /* 2. secrete (doc: md5(username . key . md5(password))) */
    const passwordMd5 = crypto.createHash('md5').update(naloPassword).digest('hex');
    const secrete = crypto
      .createHash('md5')
      .update(`${credentials.naloUsername}${key}${passwordMd5}`)
      .digest('hex');

    /* 3. exact doc shape (same order, same types) --------- */
    const payload: Record<string, string> = {
      merchant_id: credentials.naloMerchantId,
      secrete,
      key,
      order_id,
      customerName,
      amount: Number(amount).toFixed(2),
      item_desc,
      customerNumber: customerNumber.replace(/^0/, '233'),
      payby,
      // The base URL must be set in your environment variables.
      callback: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/nalo-callback`.trim(),
    };

    /* 4. stringify → matches sample byte-for-byte --------- */
    const body = JSON.stringify(payload);
    console.log('Exact Nalo body:', body);

    const proxyUrl = process.env.HTTPS_PROXY_URL;
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    };

    if (proxyUrl) {
      console.log(`Using proxy: ${proxyUrl}`);
      const agent = new HttpsProxyAgent(proxyUrl);
      (fetchOptions as any).dispatcher = agent;
    }

    const naloResponse = await fetch(
      'https://api.nalosolutions.com/payplus/api/',
      fetchOptions
    );

    const naloData = await naloResponse.json();
    console.log('Received from Nalo:', naloData);

    if (!naloResponse.ok || naloData.Status !== 'Accepted') {
      return NextResponse.json(
        { message: naloData.Description || 'Failed to initiate payment with Nalo' },
        { status: naloResponse.status }
      );
    }

    return NextResponse.json(naloData, { status: 200 });
  } catch (error) {
    console.error('Error in Nalo payment proxy:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
