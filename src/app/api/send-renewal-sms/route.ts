
import { NextResponse } from 'next/server';
import { sendSms } from '@/lib/frog-api';

export async function POST(request: Request) {
  try {
    const recipient = '0536282694';
    const message = 'Your CampusFlow monthly subscription is due for renewal soon. Please make a payment to avoid service interruption.';
    
    console.log(`Sending subscription renewal SMS to ${recipient}`);

    const result = await sendSms([recipient], message);

    if (!result.success) {
      throw new Error(result.error || 'Failed to send renewal SMS.');
    }

    return NextResponse.json({ success: true, message: 'Renewal SMS sent successfully.' }, { status: 200 });

  } catch (error) {
    console.error('Error sending renewal SMS:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
