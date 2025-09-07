
'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ConfirmPaymentComponent() {
  const router = useRouter();
  const search = useSearchParams();
  const { toast } = useToast();

  const refId = search.get('ref');
  const [transactionId, setTransactionId] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = () => {
    setIsConfirming(true);
    // In a real app, you would now send the `refId` and `transactionId`
    // to your backend to verify the payment with the payment provider.
    // For this mock, we'll just simulate a success.
    setTimeout(() => {
        toast({ title: "Payment Confirmed!", description: "Your payment has been received and is being processed. Your balance will update shortly."});
        router.push('/billing');
    }, 2000);
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-xl mx-auto p-4 text-center">
        <CardHeader>
            <CardTitle className="text-2xl font-bold">Confirm Your Payment</CardTitle>
            <CardDescription>
                Follow the instructions sent to your phone. Once you receive a confirmation SMS with a Transaction ID, enter it below.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="text-left">
                <p className="text-sm text-muted-foreground">Your Transaction Reference</p>
                <p className="font-mono font-bold text-lg p-2 bg-muted rounded-md">{refId}</p>
            </div>

            <div className="text-left">
                <Label htmlFor="transactionId">Enter Mobile Money Transaction ID</Label>
                <Input 
                    id="transactionId" 
                    placeholder="e.g., 1234567890" 
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                />
            </div>

            <Button
                onClick={handleConfirm}
                disabled={isConfirming || transactionId.length < 5}
                className="w-full"
                size="lg"
            >
                {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Payment
            </Button>
        </CardContent>
        </Card>
    </div>
  );
}


export default function ConfirmPaymentPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-10 w-10 animate-spin" /></div>}>
            <ConfirmPaymentComponent />
        </Suspense>
    )
}
