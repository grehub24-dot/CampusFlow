
'use server'

import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { IntegrationSettings } from "@/types";

const FROG_API_BASE_URL_V1 = 'https://api.wigal.com.gh/v1';
const FROG_API_BASE_URL_V3 = 'https://frogapi.wigal.com.gh/api/v3';


async function getFrogCredentials(): Promise<{ apiKey: string, senderId: string }> {
    const settingsDocRef = doc(db, "settings", "integrations");
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
        const settings = docSnap.data() as IntegrationSettings;
        const apiKey = settings.frogApiKey;
        if (!apiKey) {
            console.error("Frog API Key is not configured in settings.");
            throw new Error("Frog API Key is not configured in settings.");
        }
        return {
            apiKey: apiKey,
            senderId: settings.frogSenderId || 'CampusFlow',
        };
    }

    // Fallback or default values if no settings are found
    console.error("Frog API settings are not configured.");
    throw new Error("Frog API settings are not configured.");
}


// This is a server-side function. It will not be exposed to the client.
export async function sendSms(recipient: string, message: string) {
  const url = `${FROG_API_BASE_URL_V1}/sms/send`;
  
  try {
    const { apiKey, senderId } = await getFrogCredentials();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-KEY': apiKey
      },
      body: JSON.stringify({
        to: recipient,
        from: senderId,
        text: message
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Frog API Error:', data);
      throw new Error(data.message || 'Failed to send SMS');
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getBalance() {
    const url = `${FROG_API_BASE_URL_V3}/balance`;
    
    try {
        const { apiKey } = await getFrogCredentials();
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'API-KEY': apiKey
            }
        });
        
        const data = await response.json();

        if (!response.ok || data.status !== 'SUCCESS') {
            console.error('Frog API Error:', data);
            throw new Error(data.message || 'Failed to fetch balance');
        }
        
        const smsBalance = data.data?.bundles?.SMS || 0;
        return { success: true, balance: smsBalance };
    } catch (error) {
        console.error('Error fetching balance:', error);
        return { success: false, error: (error as Error).message, balance: 0 };
    }
}
