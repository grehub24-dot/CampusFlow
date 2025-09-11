
'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Smartphone, CreditCard, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuid } from 'uuid';
import type { Invoice, MomoProvider } from '@/types';
import Image from 'next/image';
import crypto from 'crypto';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { generateVerificationCode, verifyOtp } from '@/lib/frog-api';

const momoProviders: MomoProvider[] = [
    { code: "MTN", name: "MTN Mobile Money" },
    { code: "VODAFONE", name: "Vodafone Cash" },
    { code: "AIRTELTIGO", name: "AirtelTigo Money" },
];

function PurchaseContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [polling, setPolling] = useState(false);
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [qrPayload, setQrPayload] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'qr' | 'momo' | null>(null);
    const [selectedProvider, setSelectedProvider] = useState<MomoProvider['code'] | ''>('');
    const [phoneNumber, setPhoneNumber] = useState('0536282694');
    const [otp, setOtp] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);

    const merchantNumber = '0546282694';


    const bundleName = searchParams.get('bundle');
    const bundleCredits = searchParams.get('credits');
    const bundlePrice = searchParams.get('price');

    useEffect(() => {
        if (!bundleName || !bundleCredits || !bundlePrice) {
            toast({ variant: 'destructive', title: 'Error', description: 'No bundle selected. Redirecting...' });
            router.push('/communications');
        }
    }, [bundleName, bundleCredits, bundlePrice, router, toast]);

    const createInvoice = async () => {
        setLoading(true);
        try {
            const referenceId = `cf-sms-${uuid().substring(0, 8)}`;
            const res = await fetch('/api/create-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: bundlePrice,
                    description: `${bundleCredits} SMS Credits (${bundleName})`,
                    reference: referenceId,
                }),
            });
            if (!res.ok) throw new Error('Failed to create invoice');
            const newInvoice: Invoice = await res.json();
            setInvoice(newInvoice);
            return newInvoice;
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not initiate purchase.' });
            return null;
        } finally {
            setLoading(false);
        }
    };
    
    const handleQrPayment = async () => {
        setPaymentMethod('qr');
        const inv = await createInvoice();
        if (inv) {
            setLoading(true);
            try {
                const res = await fetch('/api/generate-gh-qr', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: inv.amount, referenceId: inv.reference }),
                });
                if (!res.ok) throw new Error('Failed to generate QR code');
                const { qrPayload } = await res.json();
                setQrPayload(qrPayload);
                setStep(2);
                startPolling(inv.id);
            } catch (e) {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not generate QR code.' });
                setPaymentMethod(null);
            } finally {
                setLoading(false);
            }
        }
    };
    
    const handleMomoPayment = async () => {
        setPaymentMethod('momo');
        const inv = await createInvoice();
        if(inv) {
            setStep(2);
        }
    }
    
    const handleSendOtp = async () => {
        if (!selectedProvider || !phoneNumber) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a provider and enter a phone number.' });
            return;
        }
        setLoading(true);
        try {
            const otpRes = await generateVerificationCode(phoneNumber);
            if (otpRes.status !== 'SUCCESS') {
                throw new Error(otpRes.message || "Failed to send OTP.");
            }
            toast({ title: "OTP Sent", description: `A verification code has been sent to ${phoneNumber}.` });
            setIsOtpSent(true);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'OTP Failed', description: e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp) return;
        setLoading(true);
        try {
            const verificationRes = await verifyOtp(phoneNumber, otp);
            if (verificationRes.status !== 'SUCCESS') {
                throw new Error('Invalid OTP. Please try again.');
            }
            toast({ title: "Verification Successful" });
            setStep(3); // Move to manual instructions
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Verification Failed', description: e.message });
        } finally {
            setLoading(false);
        }
    }

    const handleStartPolling = () => {
        if (invoice) {
            setStep(4);
            startPolling(invoice.id);
        }
    }

    const startPolling = (invoiceId: string) => {
        setPolling(true);
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/invoice-status?id=${invoiceId}`);
                if (res.ok) {
                    const { status } = await res.json();
                    if (status === 'PAID') {
                        clearInterval(interval);
                        setPolling(false);
                        setStep(5); // Success step
                    } else if (status === 'FAILED' || status === 'EXPIRED') {
                        clearInterval(interval);
                        setPolling(false);
                        toast({ variant: 'destructive', title: 'Payment Failed', description: 'Your payment could not be processed.' });
                        router.push('/communications');
                    }
                }
            } catch (e) {
                console.error("Polling error:", e);
                clearInterval(interval);
                setPolling(false);
            }
        }, 5000);

        // Stop polling after 5 minutes
        setTimeout(() => {
            clearInterval(interval);
            if (polling) {
                setPolling(false);
                toast({ variant: 'destructive', title: 'Payment Timed Out', description: 'Did not receive payment confirmation in time.' });
            }
        }, 300000);
    };

    const handleFinalConfirmation = () => {
        router.push(`/billing/confirm-purchase?invoiceId=${invoice?.id}&bundleCredits=${bundleCredits}`);
    };

    if (!bundleName || !bundlePrice || !bundleCredits) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                     <CardContent className="space-y-4">
                        <Button variant="outline" className="w-full h-20 text-lg" onClick={handleQrPayment} disabled={loading}>
                            {loading && paymentMethod === 'qr' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-4 h-8 w-8" />}
                            Pay with GhanaPay QR
                        </Button>
                        <Button variant="outline" className="w-full h-20 text-lg" onClick={handleMomoPayment} disabled={loading}>
                            {loading && paymentMethod === 'momo' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Smartphone className="mr-4 h-8 w-8" />}
                            Pay with Mobile Money
                        </Button>
                    </CardContent>
                );
            case 2: // User Verification
                return (
                     <CardContent className="space-y-6">
                        {!isOtpSent ? (
                            <>
                                <div className="space-y-2">
                                    <Label>Select your Mobile Money provider</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {momoProviders.map(p => (
                                            <Button 
                                                key={p.code} 
                                                variant={selectedProvider === p.code ? 'default' : 'outline'}
                                                onClick={() => setSelectedProvider(p.code)}
                                            >
                                                {p.name}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input id="phone" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                                </div>
                                <Button className="w-full" onClick={handleSendOtp} disabled={loading || !selectedProvider || !phoneNumber}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Proceed to Payment
                                </Button>
                            </>
                        ) : (
                             <>
                                <div className="space-y-2">
                                    <Label htmlFor="otp">Enter OTP</Label>
                                    <Input id="otp" value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter 6-digit code" maxLength={6}/>
                                </div>
                                <Button className="w-full" onClick={handleVerifyOtp} disabled={loading || otp.length < 6}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Verify Code
                                </Button>
                            </>
                        )}
                    </CardContent>
                );
            case 3: // Manual Instructions
                 return (
                    <CardContent className="space-y-4">
                        <Alert>
                            <AlertTitle>Action Required: Send Payment</AlertTitle>
                            <AlertDescription>
                                Please send **GHS {bundlePrice}** to the number below.
                            </AlertDescription>
                        </Alert>
                        <div className="text-center p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground">Merchant Number</p>
                            <p className="text-2xl font-bold tracking-widest">{merchantNumber}</p>
                        </div>
                        <Card>
                            <CardHeader><CardTitle className="text-base">Instructions (MTN *170#)</CardTitle></CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <p>1. Dial **\*170#** on your phone.</p>
                                <p>2. Select **1** for "Transfer Money".</p>
                                <p>3. Select **1** for "MoMo User".</p>
                                <p>4. Enter the merchant number: **{merchantNumber}**</p>
                                <p>5. Enter the amount: **{bundlePrice}**</p>
                                <p>6. Use reference: **{invoice?.reference || 'SMS Bundle'}**</p>
                                <p>7. Enter your PIN to confirm.</p>
                            </CardContent>
                        </Card>
                        <Button className="w-full" onClick={handleStartPolling}>
                           I Have Sent The Money
                        </Button>
                    </CardContent>
                );
            case 4: // Polling
                return (
                    <CardContent className="text-center space-y-4">
                        <Smartphone className="mx-auto h-16 w-16 text-primary" />
                        <h3 className="text-lg font-semibold">Confirming Your Payment</h3>
                        <p className="text-muted-foreground">
                            We are now checking for your payment. This may take a moment. Please do not close this page.
                        </p>
                        <Loader2 className="mx-auto mt-2 h-8 w-8 animate-spin text-muted-foreground" />
                    </CardContent>
                );
            case 5: // Success and move to final confirmation
                return (
                     <CardContent className="text-center space-y-4">
                        <ShieldCheck className="mx-auto h-16 w-16 text-green-500" />
                        <h3 className="text-lg font-semibold">Payment Received!</h3>
                        <p className="text-muted-foreground">
                            One final step to secure your account. Enter the activation code sent to the authorized number to apply your credits.
                        </p>
                        <Button className="w-full" onClick={handleFinalConfirmation}>
                            Proceed to Final Confirmation
                        </Button>
                    </CardContent>
                );
        }
    };
    

    return (
        <>
            <PageHeader
                title="Purchase SMS Credits"
                description={`You are purchasing the ${bundleName} bundle.`}
            />

            <div className="max-w-lg mx-auto">
                 <Card>
                    <CardHeader className="relative">
                        {step > 1 && (
                            <Button variant="ghost" size="icon" className="absolute left-2 top-2" onClick={() => setStep(step - 1)}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        )}
                        <CardTitle className="text-center">
                            Step {step}: {
                                step === 1 ? 'Choose Payment Method' :
                                step === 2 ? 'Enter Details' :
                                step === 3 ? 'Send Payment Manually' :
                                step === 4 ? 'Confirming Payment' :
                                'Payment Successful'
                            }
                        </CardTitle>
                        <CardDescription className="text-center">
                            Total Amount: GHS {bundlePrice}
                        </CardDescription>
                    </CardHeader>
                   
                    {renderStep()}
                </Card>
            </div>
        </>
    );
}


export default function PurchasePage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <PurchaseContent />
        </Suspense>
    )
}
