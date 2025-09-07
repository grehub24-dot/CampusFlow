
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { sendSms } from '@/lib/frog-api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Send } from 'lucide-react';

function AwaitPaymentComponent() {
  const router = useRouter();
  const search = useSearchParams();
  const { toast } = useToast();

  const phone = search.get('phone');
  const amount = search.get('amount');
  const refId = search.get('ref');

  const [isSending, setIsSending] = useState(false);

  const handleSendInstructions = async () => {
    if (!phone || !refId || !amount) {
        toast({ variant: 'destructive', title: 'Error', description: 'Missing required information to send SMS.'});
        return;
    };
    
    setIsSending(true);
    
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

    try {
        const res = await sendSms([phone], msg);
        if (res.success) { 
            toast({ title: 'Instructions Sent', description: 'Check your SMS for payment details.' }); 
            router.push(`/billing/confirm-payment?ref=${refId}`);
        } else {
            throw new Error(res.error || "Unknown error");
        }
    } catch (err: any) {
        console.error("SMS Failed:", err);
        toast({ variant: 'destructive', title: 'SMS Failed', description: err.message })
    } finally {
        setIsSending(false);
    }
  };


  return (
    <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-xl mx-auto p-4 text-center">
        <CardHeader>
            <CardTitle className="text-2xl font-bold">Complete Your Payment</CardTitle>
            <CardDescription>
                Click the button below to receive payment instructions via SMS.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <p className="text-sm text-muted-foreground">Your Transaction Reference</p>
                <p className="font-mono font-bold text-lg p-2 bg-muted rounded-md inline-block">{refId}</p>
            </div>
            <Button
                onClick={handleSendInstructions}
                disabled={isSending}
                className="w-full"
                size="lg"
            >
                {isSending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                     <Send className="mr-2 h-4 w-4" />
                )}
               Send Payment Instructions
            </Button>
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
