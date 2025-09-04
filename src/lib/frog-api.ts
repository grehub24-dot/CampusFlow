
'use server'

const FROG_API_BASE_URL = 'https://api.wigal.com.gh/v1';

// These should be stored in environment variables in a real application
const FROG_API_KEY = process.env.FROG_API_KEY || 'YOUR_FROG_API_KEY';
const FROG_SENDER_ID = process.env.FROG_SENDER_ID || 'CampusFlow';


// This is a server-side function. It will not be exposed to the client.
export async function sendSms(recipient: string, message: string) {
  const url = `${FROG_API_BASE_URL}/sms/send`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FROG_API_KEY}`
      },
      body: JSON.stringify({
        to: recipient,
        from: FROG_SENDER_ID,
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

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${FROG_API_KEY}`
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
