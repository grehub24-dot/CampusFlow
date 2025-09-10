
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { IntegrationSettings } from '@/types';


async function getNaloCredentials(): Promise<{ merchantId: string, username: string, passwordMd5: string } | null> {
    const settingsDocRef = doc(db, "settings", "integrations");
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
        const settings = docSnap.data() as IntegrationSettings;
        // The password to use is the static key provided for generating the secrete.
        const password = "kqPS9?msJ_IbPB9";
        const { naloMerchantId, naloUsername } = settings;

        if (!naloMerchantId || !naloUsername || !password) {
            console.error("Nalo API credentials are not fully configured in settings or password missing.");
            return null;
        }
        return {
            merchantId: naloMerchantId,
            username: naloUsername,
            passwordMd5: crypto.createHash('md5').update(password).digest('hex')
        };
    }

    console.error("Nalo integration settings are not configured.");
    return null;
}

export async function POST(request: Request) {
  try {
    const clientPayload = await request.json();

    const { order_id, amount, item_desc, customerNumber, payby, customerName } = clientPayload;

    if (!order_id || !amount || !item_desc || !customerNumber || !payby) {
        return NextResponse.json({ error: 'Invalid payload received from client' }, { status: 400 });
    }
    
    const credentials = await getNaloCredentials();
    if (!credentials) {
        return NextResponse.json({ error: 'Nalo API credentials not configured on server.' }, { status: 500 });
    }
    
    const { merchantId, username, passwordMd5 } = credentials;

    // Generate a random 4-digit key for each transaction as per documentation
    const key = Math.floor(1000 + Math.random() * 9000).toString();

    // Generate the secrete on the server
    const stringToHash = `${username}${key}${passwordMd5}`;
    const secrete = crypto.createHash('md5').update(stringToHash).digest('hex');
    
    // Format phone number to 233...
    let formattedNumber = String(customerNumber);
    if (formattedNumber.startsWith('0')) {
        formattedNumber = '233' + formattedNumber.substring(1);
    } else if (!formattedNumber.startsWith('233')) {
        formattedNumber = '233' + formattedNumber;
    }
    
    const finalNaloPayload = {
      merchant_id: merchantId,
      key: key,
      secrete: secrete,
      order_id: order_id,
      customerName: customerName,
      amount: amount,
      item_desc: item_desc,
      customerNumber: formattedNumber,
      payby: payby,
      callback: `${new URL(request.url).origin}/api/nalo-callback`,
      newVodaPayment: payby === 'VODAFONE' ? true : undefined,
    };
    
    console.log('Sending final payload to Nalo:', JSON.stringify(finalNaloPayload, null, 2));

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
    console.error('Error initiating Nalo payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
