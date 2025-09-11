
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

    const handleConfirmMomoSent = () => {
        if (invoice) {
            setStep(3);
            startPolling(invoice.id);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Invoice not found. Please try again.' });
        }
    };

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
                        setStep(4); // Success step
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
        }, 3000);

        // Stop polling after 3 minutes
        setTimeout(() => {
            clearInterval(interval);
            if (polling) {
                setPolling(false);
                toast({ variant: 'destructive', title: 'Payment Timed Out', description: 'Did not receive payment confirmation in time.' });
            }
        }, 180000);
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
            case 2:
                return paymentMethod === 'qr' ? (
                     <CardContent className="text-center">
                        <h3 className="text-lg font-semibold">Scan to Pay</h3>
                        <p className="text-muted-foreground mb-4">Use any banking or payment app that supports GhanaPay.</p>
                        {qrPayload ? (
                            <Image
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrPayload)}`}
                                alt="GhanaPay QR Code"
                                width={250}
                                height={250}
                                className="mx-auto border-4 border-primary p-2 rounded-lg"
                            />
                        ) : <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />}
                         <p className="mt-4 text-sm font-medium">Waiting for payment confirmation...</p>
                         {polling && <Loader2 className="mx-auto mt-2 h-6 w-6 animate-spin text-muted-foreground" />}
                    </CardContent>
                ) : (
                     <CardContent className="space-y-6">
                        <Alert>
                            <Smartphone className="h-4 w-4" />
                            <AlertTitle>Manual Payment Instructions</AlertTitle>
                            <AlertDescription>
                                Please follow the steps below to complete your payment.
                            </AlertDescription>
                        </Alert>

                         <div className="space-y-4 text-sm">
                            <div className="p-4 bg-muted rounded-md">
                                <p className="font-semibold">Transfer to this number:</p>
                                <p className="text-2xl font-bold tracking-wider text-primary">0546282694</p>
                                <p className="text-xs text-muted-foreground">(Nexora Systems)</p>
                            </div>
                            <div>
                                <p className="font-semibold mb-1">Steps to pay with MTN (*170#):</p>
                                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                                    <li>Dial <strong>*170#</strong> on your phone.</li>
                                    <li>Select option <strong>1</strong> (Transfer Money).</li>
                                    <li>Select option <strong>1</strong> (MoMo User).</li>
                                    <li>Enter the number: <strong>0546282694</strong>.</li>
                                    <li>Confirm the number.</li>
                                    <li>Enter the amount: <strong>GHS {bundlePrice}</strong>.</li>
                                    <li>For Reference, enter: <strong>{invoice?.reference}</strong></li>
                                    <li>Enter your PIN to confirm.</li>
                                </ol>
                            </div>
                         </div>
                          <Button className="w-full" onClick={handleConfirmMomoSent}>
                            I have sent the money
                        </Button>
                    </CardContent>
                );
            case 3:
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
            case 4:
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
                        {step > 1 && paymentMethod !== 'qr' && (
                            <Button variant="ghost" size="icon" className="absolute left-2 top-2" onClick={() => setStep(step - 1)}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        )}
                        <CardTitle className="text-center">
                            Step {step}: {
                                step === 1 ? 'Choose Payment Method' :
                                step === 2 && paymentMethod === 'qr' ? 'Scan QR Code' :
                                step === 2 && paymentMethod === 'momo' ? 'Send Mobile Money' :
                                step === 3 ? 'Confirming Payment' :
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
