
'use server'

import { doc, getDoc, addDoc, collection, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import type { IntegrationSettings } from "@/types";
import { v4 as uuidv4 } from 'uuid';


const FROG_API_BASE_URL_V3 = 'https://frogapi.wigal.com.gh/api/v3';


async function getFrogCredentials(): Promise<{ apiKey: string, senderId: string, username: string } | null> {
    const settingsDocRef = doc(db, "settings", "integrations");
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
        const settings = docSnap.data() as IntegrationSettings;
        const apiKey = settings.frogApiKey;
        const username = settings.frogUsername;
        if (!apiKey || !username) {
            console.error("Frog API Key or Username is not configured in settings.");
            return null;
        }
        return {
            apiKey: apiKey,
            senderId: settings.frogSenderId || 'CampusFlow',
            username: username,
        };
    }

    console.error("Frog API settings are not configured.");
    return null;
}


// This is a server-side function. It will not be exposed to the client.
export async function sendSms(recipients: string[], message: string) {
  const url = `${FROG_API_BASE_URL_V3}/sms/send`;
  
  try {
    const credentials = await getFrogCredentials();
    if (!credentials) {
        throw new Error("Frog API credentials are not configured.");
    }
    const { apiKey, senderId, username } = credentials;

    const destinations = recipients.map(r => ({
      destination: r,
      msgid: `cf-${uuidv4()}`
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-KEY': apiKey,
        'USERNAME': username
      },
      body: JSON.stringify({
        senderid: senderId,
        destinations: destinations,
        message: message,
        smstype: 'text'
      })
    });

    const data = await response.json();
    if (!response.ok || data.status !== 'ACCEPTD') {
      console.error('Frog API Error:', data);
      throw new Error(data.message || 'Failed to send SMS');
    }
    
    // Log messages to Firestore in a batch
    const batch = writeBatch(db);
    destinations.forEach(dest => {
        const messageRef = doc(collection(db, "messages"));
        batch.set(messageRef, {
            msgid: dest.msgid,
            recipient: dest.destination,
            content: message,
            status: "Sent", // API response is generic, so we assume 'Sent' initially
            sentDate: new Date().toISOString(),
        });
    });
    await batch.commit();

    return { success: true, data };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function getBalance() {
    const url = `${FROG_API_BASE_URL_V3}/balance`;
    
    try {
        const credentials = await getFrogCredentials();
        if (!credentials) {
            // If no credentials, we can't fetch balance. Return success:false.
            return { success: false, error: 'API credentials not configured.', balance: 0 };
        }
        const { apiKey, username } = credentials;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'API-KEY': apiKey,
                'USERNAME': username,
            }
        });
        
        const data = await response.json();

        if (!response.ok || data.status !== 'SUCCESS') {
            // Don't show an error toast if the API is simply not configured.
            if (data.message !== 'API credentials not configured.') {
                 console.error('Frog API Error:', data);
                 throw new Error(data.message || 'Failed to fetch balance');
            }
            return { success: false, error: data.message, balance: 0 };
        }
        
        const smsBalance = data.data?.bundles?.SMS || 0;
        return { success: true, balance: smsBalance };
    } catch (error) {
        // Avoid creating a toast for a simple config error
        if ((error as Error).message !== 'Frog API Key or Username is not configured in settings.') {
             console.error('Error fetching balance:', error);
        }
        return { success: false, error: (error as Error).message, balance: 0 };
    }
}
