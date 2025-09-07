
import { NextResponse } from 'next/server';
import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { verifyOtp } from '@/lib/frog-api';

export async function POST(request: Request) {
  try {
    const { phone, otp, bundleCredits, invoiceId } = await request.json();

    if (!phone || !otp || !bundleCredits || !invoiceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Verify the final OTP
    const otpVerificationResult = await verifyOtp(phone, otp);
    if (otpVerificationResult.status !== 'SUCCESS') {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    // 2. Update the SMS balance in a transaction
    const billingSettingsRef = doc(db, "settings", "billing");

    await runTransaction(db, async (transaction) => {
        const billingDoc = await transaction.get(billingSettingsRef);
        
        if (!billingDoc.exists()) {
            // If doc doesn't exist, create it with the new balance
            transaction.set(billingSettingsRef, { smsBalance: Number(bundleCredits) });
        } else {
            const currentBalance = billingDoc.data().smsBalance || 0;
            const newBalance = currentBalance + Number(bundleCredits);
            transaction.update(billingSettingsRef, { smsBalance: newBalance });
        }
    });

    // Optionally, you could also update the invoice status in another collection here.

    return NextResponse.json({ success: true, message: 'Purchase confirmed and bundle applied.' }, { status: 200 });

  } catch (error) {
    console.error('Error finalizing purchase:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
