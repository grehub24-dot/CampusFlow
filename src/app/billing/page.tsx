
'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Smartphone, CreditCard, ShoppingCart, CheckCircle, QrCode } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Invoice as InvoiceType, MomoProvider, Bundle } from '@/types';
import Image from 'next/image';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { generateVerificationCode, verifyOtp } from '@/lib/frog-api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const communicationBundles: Bundle[] = [
    { name: 'Basic Bundle', msgCount: 175, price: 30, validity: 30 },
    { name: 'Standard Bundle', msgCount: 350, price: 60, validity: 30 },
    { name: 'Pro Bundle', msgCount: 700, price: 120, validity: 30 },
    { name: 'Business Bundle', msgCount: 1750, price: 240, validity: 30 },
];

const MOMO_PROVIDERS = [
  { code: "MTN",   name: "MTN Mobile Money" },
  { code: "VODAFONE",   name: "Vodafone Cash" },
  { code: "AIRTELTIGO",  name: "AirtelTigo Money" },
] as const;


function PurchaseCard({ bundle, onPurchase }: { bundle: Bundle; onPurchase: (bundle: Bundle) => void; }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl">{bundle.name}</CardTitle>
        <CardDescription>{bundle.msgCount} SMS credits</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-3xl font-bold text-primary">GHS {bundle.price}</p>
        <p className="text-sm text-muted-foreground">Valid for {bundle.validity} days</p>
      </CardContent>
      <div className="p-4 pt-0">
        <Button className="w-full" onClick={() => onPurchase(bundle)}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Buy Credit
        </Button>
      </div>
    </Card>
  );
}

function CheckoutModal({
  open,
  bundle,
  onClose,
}: {
  open: boolean;
  bundle: Bundle | null;
  onClose: () => void;
}) {
  const [provider, setProvider] = useState<MomoProvider['code']>("MTN");
  const [mobileNumber, setMobileNumber] = useState('0536282694');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'payment-method' | 'qr-payment' | 'nalo-wait'>('details');
  const [invoice, setInvoice] = useState<{ id: string; qrPayload?: string, naloInvoiceNo?: string } | null>(null);
  const router = useRouter();

  const { toast } = useToast();
  
  useEffect(() => {
    if (open) {
        // Reset state when modal opens
        setCheckoutStep('details');
        setIsVerified(false);
        setOtpSent(false);
        setOtp("");
        setLoading(false);
        setInvoice(null);
    }
  }, [bundle, open]);

  // Polling for Nalo payment status
  useEffect(() => {
    if (checkoutStep !== 'nalo-wait' || !invoice?.id) return;
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/invoice-status?id=${invoice.id}`);
        if(res.ok) {
          const { status } = await res.json();
          if (status === 'PAID') {
            clearInterval(interval);
            handlePaymentComplete();
          } else if (status === 'FAILED') {
            clearInterval(interval);
            toast({ variant: 'destructive', title: 'Payment Failed', description: 'Your payment could not be processed.' });
            setCheckoutStep('payment-method');
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [checkoutStep, invoice?.id]);


  async function handleSendOtp() {
    setLoading(true);
    try {
      const res = await generateVerificationCode(mobileNumber);
      if (res.status === 'SUCCESS') {
        toast({ title: "OTP Sent", description: "Check your phone for the verification code." });
        setOtpSent(true);
      } else {
        throw new Error(res.message);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Could not send OTP", description: e.message });
    } finally {
      setLoading(false);
    }
  }
  
  async function handleVerifyOtp() {
    setLoading(true);
    try {
        const res = await verifyOtp(mobileNumber, otp);
        if (res.status === 'SUCCESS') {
            toast({ title: "Number verified ✅" });
            setIsVerified(true);
        } else {
            throw new Error(res.message);
        }
    } catch(e: any) {
         toast({ variant: "destructive", title: "Verification Failed", description: e.message });
    } finally {
        setLoading(false);
    }
  }
  
  async function handleProceedToPaymentSelection() {
    if (!bundle) return;
    setLoading(true);
    
    try {
      const invRes = await fetch("/api/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: bundle.price,
          description: `${bundle.name} (${bundle.msgCount} SMS)`,
          reference: `sms-${bundle.msgCount}-${Date.now()}`,
        }),
      });

      if (!invRes.ok) throw new Error("Invoice creation failed");
      const createdInvoice: InvoiceType = await invRes.json();
      setInvoice({ id: createdInvoice.id });
      setCheckoutStep('payment-method');

    } catch (e: any) {
       toast({ variant: "destructive", title: "Payment Error", description: e.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectPaymentMethod(method: 'ghanaPay' | 'nalo') {
    if (!invoice || !bundle) return;
    setLoading(true);
    
    try {
        if (method === 'ghanaPay') {
            const qrRes = await fetch("/api/generate-gh-qr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: bundle.price,
                    referenceId: invoice.id,
                })
            });
            if (!qrRes.ok) throw new Error("Failed to generate QR Code data.");
            const { qrPayload } = await qrRes.json();
            setInvoice(prev => prev ? ({ ...prev, qrPayload }) : null);
            setCheckoutStep('qr-payment');
        } else { // Nalo Pay
            const naloRes = await fetch('/api/initiate-nalo-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                order_id: invoice.id,
                customerName: "CampusFlow User",
                amount: bundle.price,
                item_desc: `${bundle.msgCount} SMS Credit Bundle`,
                customerNumber: mobileNumber,
                payby: provider,
              })
            });
            const naloData = await naloRes.json();
            if (!naloRes.ok || naloData.Status !== 'Accepted') {
              throw new Error(naloData.message || 'Failed to initiate Nalo payment.');
            }
            setInvoice(prev => prev ? ({ ...prev, naloInvoiceNo: naloData.InvoiceNo }) : null);
            setCheckoutStep('nalo-wait');
        }
    } catch(e: any) {
        toast({ variant: "destructive", title: "Payment Error", description: e.message });
    } finally {
        setLoading(false);
    }
  }


  function handlePaymentComplete() {
    if (!invoice || !bundle) return;
    const params = new URLSearchParams({
      invoiceId: invoice.id,
      bundleCredits: String(bundle.msgCount),
      phone: mobileNumber,
    });
    router.push(`/billing/confirm-purchase?${params.toString()}`);
  }
  
  if (!bundle) return null;
  
  const renderStep = () => {
    switch(checkoutStep) {
        case 'details':
            return (
              <div className="p-8">
                <button onClick={onClose} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <div className="mt-6">
                  <h3 className="text-lg font-semibold">Pay With:</h3>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button variant="outline" className="border-primary text-primary border-2">
                      <Smartphone className="mr-2" /> Mobile Money
                    </Button>
                    <Button variant="outline" disabled>
                      <CreditCard className="mr-2" /> Credit Card(3DS)
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Make Invoice payment Via MTN MoMo, Vodafone Cash or Airtel/Tigo Money</p>
                </div>
                
                <div className="mt-6 space-y-4">
                  <div>
                      <Label>Provider</Label>
                      <Select value={provider} onValueChange={(v) => setProvider(v as MomoProvider['code'])}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MOMO_PROVIDERS.map((p) => (
                            <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  </div>
                  <div>
                      <Label>Mobile Number</Label>
                      <div className="flex gap-2">
                        <Input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} disabled={otpSent}/>
                        {!isVerified && (
                          <Button variant="outline" onClick={handleSendOtp} disabled={otpSent || loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Verify'}
                          </Button>
                        )}
                      </div>
                  </div>
                  {otpSent && !isVerified && (
                      <div>
                          <Label>OTP</Label>
                          <div className="flex gap-2">
                              <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP"/>
                              <Button variant="outline" onClick={handleVerifyOtp} disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Confirm'}
                              </Button>
                          </div>
                      </div>
                  )}
                </div>
                <Button className="w-full mt-8" size="lg" onClick={handleProceedToPaymentSelection} disabled={loading || !isVerified}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'PROCEED'}
                </Button>

                <div className="text-center mt-4 text-xs text-muted-foreground">
                    Powered by <span className="font-bold">CompusFlow</span> | Privacy | Terms
                </div>
              </div>
           );
        case 'payment-method':
            return (
                <div className="p-8 flex flex-col justify-center text-center">
                    <h2 className="text-2xl font-bold mb-2">Choose Payment Method</h2>
                    <p className="text-muted-foreground mb-6">How would you like to pay for your bundle?</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => handleSelectPaymentMethod('ghanaPay')} disabled={loading}>
                           <QrCode className="h-8 w-8" />
                           <span className="font-semibold">GhanaPay (QR Code)</span>
                        </Button>
                        <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => handleSelectPaymentMethod('nalo')} disabled={loading}>
                           <Smartphone className="h-8 w-8" />
                           <span className="font-semibold">Nalo Momo Pay (Direct)</span>
                        </Button>
                    </div>
                     {loading && <Loader2 className="mx-auto mt-4 h-6 w-6 animate-spin"/>}
                </div>
            );
        case 'qr-payment':
            return (
             <div className="p-8 flex flex-col items-center justify-center text-center">
                 <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                 <h2 className="text-2xl font-bold mb-2">Scan to Pay</h2>
                 <p className="text-muted-foreground mb-4">Use your payment app or mobile money service to scan the QR code and complete your purchase.</p>
                 
                 <div className="p-4 bg-muted rounded-lg">
                    <Image 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(invoice?.qrPayload || '')}`}
                      width={250} 
                      height={250} 
                      alt="Gh-QR Code for Payment"
                      data-ai-hint="qr code"
                    />
                 </div>
                 
                 <div className="mt-4 text-sm">
                    <p>Amount: <span className="font-bold">GHS {bundle.price}</span></p>
                    <p>Reference: <span className="font-bold font-mono">{invoice?.id}</span></p>
                 </div>

                 <Button className="w-full mt-6" onClick={handlePaymentComplete}>
                    I have completed the payment
                 </Button>
             </div>
           );
        case 'nalo-wait':
            return (
                 <div className="p-8 flex flex-col items-center justify-center text-center">
                    <Smartphone className="h-16 w-16 text-primary mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Check Your Phone</h2>
                    <p className="text-muted-foreground mb-4">A payment prompt has been sent to your phone. Please authorize the transaction to complete your purchase.</p>
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm mt-4">Waiting for confirmation...</p>
                 </div>
            )
        default:
            return null;
    }
  }


  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl p-0" onInteractOutside={(e) => e.preventDefault()}>
         <DialogHeader className="sr-only">
          <DialogTitle>Complete Your Purchase</DialogTitle>
          <DialogDescription>
            Enter your payment details to buy SMS credits.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-[1fr,400px]">
          {/* Left side: Form */}
           {renderStep()}
          
          {/* Right side: Invoice Details */}
          <div className="bg-[#EBF3FF] p-8 space-y-6">
            
             <Card>
                <CardHeader>
                  <CardTitle>Invoice Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                   <div className="flex justify-between">
                     <span>Amount:</span>
                     <span className="font-medium">GHS {bundle.price}</span>
                   </div>
                   <div className="flex justify-between">
                     <span>Description:</span>
                     <span className="font-medium text-right flex items-center gap-1">
                         CF Invoice Payment
                     </span>
                   </div>
                   <hr/>
                   <div className="flex justify-between font-bold text-base">
                     <span>Total:</span>
                     <span>GHS {bundle.price}</span>
                   </div>
                </CardContent>
             </Card>

             <div className="bg-blue-900 text-white rounded-lg p-6 text-center space-y-2">
                <p className="text-lg font-semibold">CompusFlow</p>
                <p className="text-3xl font-bold tracking-wider">{mobileNumber}</p>
                <p className="text-sm">Provider: {provider}</p>
             </div>
             
             <div className="flex justify-center">
                <Image src="https://picsum.photos/80/30" width={80} height={30} alt="PCI DSS" data-ai-hint="logo" />
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


export default function BillingPage() {
    const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);

    return (
        <>
            <PageHeader
                title="Billing & Subscriptions"
                description="Top-up credits instantly via Mobile Money to send communications."
            />
            <Card>
                <CardHeader>
                    <CardTitle>Purchase SMS / Email Bundles</CardTitle>
                    <CardDescription>Select a bundle to top-up your credits.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {communicationBundles.map((b) => (
                    <PurchaseCard key={b.name} bundle={b} onPurchase={setSelectedBundle} />
                ))}
                </CardContent>
            </Card>

            <CheckoutModal
                open={!!selectedBundle}
                bundle={selectedBundle}
                onClose={() => setSelectedBundle(null)}
            />
        </>
    )
}

    