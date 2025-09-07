
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { sendSms } from '@/lib/frog-api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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


  /* 2.  WAIT FOR USER TO CLICK “I have completed the payment” -- */
  const handleCompleted = () => {
    toast({ title: "Confirmation Received", description: "We are now verifying your payment. Your balance will update shortly."});
    // Redirect the user. The backend will handle the payment confirmation.
    router.push('/billing');
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
