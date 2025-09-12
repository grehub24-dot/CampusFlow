
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

    if (purchaseType === 'subscription') {
      // It's a subscription upgrade, update the currentPlan
      await runTransaction(db, async (transaction) => {
        const billingDoc = await transaction.get(billingSettingsRef);
        if (!billingDoc.exists()) {
            // If doc doesn't exist, create it with the new plan
            transaction.set(billingSettingsRef, { currentPlan: bundleCredits });
        } else {
            transaction.update(billingSettingsRef, { currentPlan: bundleCredits });
        }
      });

    } else { // Default to 'sms'
      // It's an SMS bundle purchase, update the smsBalance
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
    }


    // Optionally, you could also update the invoice status in another collection here.

    return NextResponse.json({ success: true, message: 'Purchase confirmed and applied.' }, { status: 200 });

  } catch (error) {
    console.error('Error finalizing purchase:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
