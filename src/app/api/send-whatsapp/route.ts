
'use server'

import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { IntegrationSettings } from '@/types';

// Helper function to get WhatsApp credentials from Firestore
async function getWhatsAppCredentials(): Promise<{ accessToken: string; phoneNumberId: string } | null> {
  const settingsDocRef = doc(db, 'settings', 'integrations');
  const docSnap = await getDoc(settingsDocRef);

  if (docSnap.exists()) {
    const settings = docSnap.data() as IntegrationSettings;
    const { whatsappAccessToken, whatsappPhoneNumberId } = settings;

    if (!whatsappAccessToken || !whatsappPhoneNumberId) {
      console.error('WhatsApp Access Token or Phone Number ID is not configured.');
      return null;
    }
    return { accessToken: whatsappAccessToken, phoneNumberId: whatsappPhoneNumberId };
  }

  console.error('WhatsApp integration settings are not configured.');
  return null;
}

export async function POST(request: Request) {
  try {
    const { recipients, message } = await request.json();

    if (!recipients || !Array.isArray(recipients) || !message) {
      return NextResponse.json({ error: 'Missing required fields: recipients and message' }, { status: 400 });
    }

    const credentials = await getWhatsAppCredentials();
    if (!credentials) {
      return NextResponse.json({ error: 'WhatsApp API credentials are not set up in settings.' }, { status: 500 });
    }

    const { accessToken, phoneNumberId } = credentials;
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    // Process all recipient messages concurrently
    const sendPromises = recipients.map(async (recipient) => {
      // Basic phone number formatting for WhatsApp
      let formattedRecipient = recipient.replace(/\D/g, ''); // Remove non-digits
      if (formattedRecipient.startsWith('0')) {
          formattedRecipient = '233' + formattedRecipient.substring(1);
      }
      
      const payload = {
        messaging_product: 'whatsapp',
        to: formattedRecipient,
        type: 'text',
        text: { body: message },
      };

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error(`Failed to send to ${formattedRecipient}:`, data.error?.message || data);
          return { recipient: formattedRecipient, success: false, error: data.error?.message || 'Unknown error' };
        }
        return { recipient: formattedRecipient, success: true, data };
      } catch (e) {
        console.error(`Exception sending to ${formattedRecipient}:`, e);
        return { recipient: formattedRecipient, success: false, error: (e as Error).message };
      }
    });

    const results = await Promise.all(sendPromises);
    const successfulSends = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      message: `Attempted to send messages to ${recipients.length} recipients. ${successfulSends} were successful.`,
      results,
    }, { status: 200 });

  } catch (error) {
    console.error('Error in /api/send-whatsapp:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
