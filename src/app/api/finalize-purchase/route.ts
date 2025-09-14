
import { NextResponse } from 'next/server';
import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { verifyOtp } from '@/lib/frog-api';

export async function POST(request: Request) {
  try {
    const { phone, otp, bundleCredits, invoiceId, purchaseType } = await request.json();

    if (!phone || !otp || !bundleCredits || !invoiceId || !purchaseType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Verify the final OTP against the number it was sent to
    const otpVerificationResult = await verifyOtp(phone, otp);
    if (otpVerificationResult.status !== 'SUCCESS') {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    // 2. Update Firestore based on purchase type
    const billingSettingsRef = doc(db, "settings", "billing");

    await runTransaction(db, async (transaction) => {
        const billingDoc = await transaction.get(billingSettingsRef);
        const currentData = billingDoc.data() || {};
        
        let updates: Record<string, any> = {};

        if (purchaseType === 'subscription') {
            updates.currentPlan = bundleCredits;
            // If upgrading to starter or pro, add 100 SMS credits
            if (bundleCredits === 'starter' || bundleCredits === 'pro') {
                const currentBalance = currentData.smsBalance || 0;
                updates.smsBalance = currentBalance + 100;
            }
        } else { // 'sms' purchase
            const currentBalance = currentData.smsBalance || 0;
            updates.smsBalance = currentBalance + Number(bundleCredits);
        }

        if (billingDoc.exists()) {
            transaction.update(billingSettingsRef, updates);
        } else {
            transaction.set(billingSettingsRef, updates);
        }
    });

    // Optionally, you could also update the invoice status in another collection here.

    return NextResponse.json({ success: true, message: 'Purchase confirmed and applied.' }, { status: 200 });

  } catch (error) {
    console.error('Error finalizing purchase:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
