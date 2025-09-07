
'use client'

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, Timer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateOtp } from '@/lib/frog-api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function ConfirmPurchaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');

  const invoiceId = searchParams.get('invoiceId');
  const bundleCredits = searchParams.get('bundleCredits');
  const phone = searchParams.get('phone');

  useEffect(() => {
    // Send OTP when the component mounts
    if (phone) {
      generateOtp(phone).then((res) => {
        if (res.status === 'SUCCESS') {
          toast({
            title: 'Confirmation OTP Sent',
            description: 'Check your phone for the final verification code.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Failed to Send OTP',
            description: 'Could not send confirmation OTP. Please try again.',
          });
        }
      });
    }
  }, [phone, toast]);
  
  const handleConfirm = async () => {
    if (!phone || !otp || !bundleCredits || !invoiceId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Missing required information.' });
        return;
    }
    setLoading(true);
    try {
        const res = await fetch('/api/finalize-purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, otp, bundleCredits, invoiceId }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to confirm purchase.');
        }

        toast({
            title: 'Purchase Successful!',
            description: `Your account has been credited with ${bundleCredits} SMS units.`,
        });

        router.push('/billing');
        
    } catch (e: any) {
         toast({ variant: 'destructive', title: 'Confirmation Failed', description: e.message });
    } finally {
        setLoading(false);
    }
  };

  return (
    <>
        <PageHeader 
            title="Confirm Your Purchase"
            description="Enter the final OTP sent to your phone to complete the transaction."
        />
        <div className="max-w-md mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Final Verification</CardTitle>
                    <CardDescription>
                        For your security, please enter the 6-digit code we sent to your mobile number to apply the bundle to your account.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Alert>
                        <Timer className="h-4 w-4" />
                        <AlertTitle>Waiting for Payment Confirmation</AlertTitle>
                        <AlertDescription>
                            Your payment is being processed. This can take up to 5 minutes. Once you enter the OTP, your balance will be updated.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <Label htmlFor="otp">Confirmation OTP</Label>
                        <Input 
                            id="otp" 
                            value={otp} 
                            onChange={(e) => setOtp(e.target.value)} 
                            placeholder="Enter 6-digit code"
                            maxLength={6}
                        />
                    </div>
                    <Button onClick={handleConfirm} disabled={loading || otp.length < 6} className="w-full">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                        Confirm & Apply Bundle
                    </Button>
                </CardContent>
            </Card>
        </div>
    </>
  )
}


export default function ConfirmPurchasePage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ConfirmPurchaseContent />
        </Suspense>
    )
}
