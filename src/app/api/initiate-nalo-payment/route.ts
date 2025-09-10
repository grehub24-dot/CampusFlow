
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { doc, getDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { IntegrationSettings } from '@/types';

// This function can be moved to a shared lib if needed elsewhere
async function getNaloCredentials(): Promise<{ merchant_id: string, username: string, password_md5: string } | null> {
    const settingsDocRef = doc(db, "settings", "integrations");
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
        const settings = docSnap.data() as IntegrationSettings;
        if (!settings.naloMerchantId || !settings.naloUsername || !settings.naloPassword) {
            console.error("Nalo payment settings are incomplete.");
            return null;
        }
        return {
            merchant_id: settings.naloMerchantId,
            username: settings.naloUsername,
            password_md5: crypto.createHash('md5').update(settings.naloPassword).digest('hex'),
        };
    }
    console.error("Nalo integration settings are not configured.");
    return null;
}


export async function POST(request: Request) {
  try {
    const { order_id, customerName, amount, item_desc, customerNumber, payby } = await request.json();

    if (!order_id || !customerName || !amount || !item_desc || !customerNumber || !payby) {
        return NextResponse.json({ error: 'Missing required Nalo payment fields' }, { status: 400 });
    }

    const credentials = await getNaloCredentials();
    if (!credentials) {
        return NextResponse.json({ error: 'Nalo payment gateway not configured on server.' }, { status: 500 });
    }

    const key = Math.floor(1000 + Math.random() * 9000).toString(); // Random 4-digit key
    const secrete = crypto.createHash('md5').update(`${credentials.username}${key}${credentials.password_md5}`).digest('hex');

    const naloPayload = {
        merchant_id: credentials.merchant_id,
        secrete,
        key,
        order_id,
        customerName,
        amount: String(amount),
        item_desc,
        customerNumber,
        payby,
        newVodaPayment: payby === 'VODAFONE' ? true : undefined, // Use the modern Vodafone flow
        callback: `${process.env.NEXT_PUBLIC_BASE_URL}/api/nalo-callback`,
    };

    const naloResponse = await fetch('https://api.nalosolutions.com/payplus/api/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(naloPayload),
    });

    const naloData = await naloResponse.json();

    if (!naloResponse.ok || naloData.Status !== 'Accepted') {
      console.error('Nalo API Error:', naloData);
      return NextResponse.json({ message: naloData.Description || 'Failed to initiate payment with Nalo' }, { status: 500 });
    }

    return NextResponse.json(naloData, { status: 200 });

  } catch (error) {
    console.error('Error initiating Nalo payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


    