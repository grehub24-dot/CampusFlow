
'use server'

import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { IntegrationSettings } from "@/types";

const FROG_API_BASE_URL = 'https://api.wigal.com.gh/v1';


async function getFrogCredentials(): Promise<{ apiKey: string, senderId: string }> {
    const settingsDocRef = doc(db, "settings", "integrations");
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
        const settings = docSnap.data() as IntegrationSettings;
        return {
            apiKey: settings.frogApiKey || '',
            senderId: settings.frogSenderId || 'CampusFlow',
        };
    }

    // Fallback or default values if no settings are found
    return { 
        apiKey: process.env.FROG_API_KEY || '', 
        senderId: process.env.FROG_SENDER_ID || 'CampusFlow' 
    };
}


// This is a server-side function. It will not be exposed to the client.
export async function sendSms(recipient: string, message: string) {
  const url = `${FROG_API_BASE_URL}/sms/send`;
  const { apiKey, senderId } = await getFrogCredentials();

  if (!apiKey) {
    return { success: false, error: "Frog API Key is not configured in settings." };
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        to: recipient,
        from: senderId,
        text: message
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Frog API Error:', errorData);
      throw new Error(errorData.message || 'Failed to send SMS');
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getBalance() {
    const url = `${FROG_API_BASE_URL}/user/balance`;
    const { apiKey } = await getFrogCredentials();

    if (!apiKey) {
      return { success: false, error: "Frog API Key is not configured in settings.", balance: 0 };
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Frog API Error:', errorData);
            throw new Error(errorData.message || 'Failed to fetch balance');
        }

        const data = await response.json();
        // Assuming the balance is in a property called 'balance'
        return { success: true, balance: data.balance || 0 };
    } catch (error) {
        console.error('Error fetching balance:', error);
        return { success: false, error: (error as Error).message, balance: 0 };
    }
}
