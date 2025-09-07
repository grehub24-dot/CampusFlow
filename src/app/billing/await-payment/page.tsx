
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { sendSms } from '@/lib/frog-api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Bundle } from '@/types';

function AwaitPaymentComponent() {
  const router = useRouter();
  const search = useSearchParams();
  const { toast } = useToast();

  const phone = search.get('phone');
  const amount = search.get('amount');
  const refId = search.get('ref');

  const [smsSent, setSmsSent] = useState(false);
  const [isSending, setIsSending] = useState(true);

  /* 1.  SEND SMS ONCE WHEN PAGE LOADS --------------------------- */
  useEffect(() => {
    if (!phone || !refId || !amount) {
        toast({ variant: 'destructive', title: 'Error', description: 'Missing payment details. Please try again.' });
        router.push('/billing');
        return;
    };
    
    const msg = `CampusFlow payment instructions
Reference : ${refId}
Dial *170# on your phone.
- Select Option 1  (Transfer Money)
- Select Option 1  (Mobile Money User)
- Enter 0536282694  and confirm
- Enter amount  ${amount} GHS
- Enter reference :  ${refId}
- Enter PIN to confirm
After SMS confirmation return to the portal and click “I have completed the payment”.`;

    sendSms([phone], msg)
      .then(res => {
        if (res.success) { 
            toast({ title: 'Instructions Sent', description: 'Check your SMS for payment details.' }); 
            setSmsSent(true); 
        }
        else throw new Error(res.error);
      })
      .catch(err => toast({ variant: 'destructive', title: 'SMS Failed', description: err.message }))
      .finally(() => setIsSending(false));
  }, [phone, refId, amount, toast, router]);

  /* 2. LISTEN FOR PAYMENT CONFIRMATION */
   useEffect(() => {
    if (!refId) return;

    // This is a mock API route. In a real app, this would poll your payment provider.
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/invoice-status?id=${refId}`);
        if (!res.ok) return;
        const json = await res.json();

        if (json.status === "PAID") {
            toast({ title: "Payment received ✅", description: "Your bundle has been credited." });

            const billingSettingsRef = doc(db, "settings", "billing");
            const communicationBundles: Bundle[] = [
                { name: 'Basic Bundle', msgCount: 175, price: 5, validity: 30 },
                { name: 'Standard Bundle', msgCount: 350, price: 10, validity: 30 },
                { name: 'Pro Bundle', msgCount: 700, price: 20, validity: 30 },
                { name: 'Business Bundle', msgCount: 1750, price: 50, validity: 30 },
            ];
            const purchasedBundle = communicationBundles.find(b => b.price === parseFloat(amount || "0"));

            if (purchasedBundle) {
                const docSnap = await getDoc(billingSettingsRef);
                const currentBalance = docSnap.exists() ? (docSnap.data().smsBalance || 0) : 0;
                const newBalance = currentBalance + purchasedBundle.msgCount;
                await setDoc(billingSettingsRef, { smsBalance: newBalance }, { merge: true });
            }
            
            clearInterval(intervalId);
            router.push('/billing'); // Redirect back to billing page
        }
        if (json.status === "FAILED" || json.status === "EXPIRED") {
            toast({ variant: "destructive", title: "Payment failed" });
            clearInterval(intervalId);
            router.push('/billing');
        }
      } catch (e) {
        // Silently ignore polling errors
      }
    }, 5000); // Poll every 5 seconds
    
    return () => clearInterval(intervalId);
  }, [refId, amount, toast, router]);

  /* 3.  WAIT FOR USER TO CLICK “I have completed the payment” -- */
  const handleCompleted = () => {
    toast({ title: "Confirmation Received", description: "We are now verifying your payment. This may take a moment."});
    // The useEffect poller above will handle the redirect.
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-xl mx-auto p-4">
        <CardHeader>
            <CardTitle className="text-2xl font-bold">Awaiting Payment</CardTitle>
            <CardDescription>
                {isSending 
                    ? "Sending payment instructions to your phone..." 
                    : "Please check your SMS for instructions to complete the payment."
                }
            </CardDescription>
        </CardHeader>
        <CardContent>
            {isSending ? (
                <div className="flex justify-center items-center h-24">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    <div className="mb-4 p-4 bg-muted rounded-md text-center">
                        <p className="text-sm text-muted-foreground">Transaction Reference</p>
                        <p className="font-mono font-bold text-lg">{refId}</p>
                    </div>

                    <Button
                        onClick={handleCompleted}
                        disabled={!smsSent}
                        className="w-full"
                        size="lg"
                    >
                        I have completed the payment
                    </Button>
                </>
            )}
        </CardContent>
        </Card>
    </div>
  );
}


export default function AwaitPaymentPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-10 w-10 animate-spin" /></div>}>
            <AwaitPaymentComponent />
        </Suspense>
    )
}
