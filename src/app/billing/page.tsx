
'use client'

import React, { useState, useEffect } from 'react';
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
import { Loader2, ArrowLeft, Smartphone, CreditCard, CheckCircle, ShoppingCart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Invoice as InvoiceType, MomoProvider, Bundle } from '@/types';
import Image from 'next/image';
import { doc, setDoc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { generateOtp, verifyOtp } from '@/lib/frog-api';

const communicationBundles: Bundle[] = [
    { name: 'Basic Bundle', msgCount: 175, price: 5, validity: 30 },
    { name: 'Standard Bundle', msgCount: 350, price: 10, validity: 30 },
    { name: 'Pro Bundle', msgCount: 700, price: 20, validity: 30 },
    { name: 'Business Bundle', msgCount: 1750, price: 50, validity: 30 },
];

const MOMO_PROVIDERS = [
  { code: "MTN",   name: "MTN Mobile Money" },
  { code: "VOD",   name: "Vodafone Cash" },
  { code: "TIGO",  name: "AirtelTigo Money" },
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
  const [invoice, setInvoice] = useState<InvoiceType | null>(null);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'verify-number' | 'process-payment' | 'await-approval'>('verify-number');

  const { toast } = useToast();
  
  useEffect(() => {
    if (open) {
        // Reset state when modal opens
        setCheckoutStep('verify-number');
        setInvoice(null);
        setIsVerified(false);
        setOtpSent(false);
        setOtp("");
    }
  }, [bundle, open]);

  useEffect(() => {
    if (!invoice || !open) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/invoice-status?id=${invoice.id}`);
        if (!res.ok) return;
        const json = await res.json();

        if (json.status === "PAID") {
            toast({ title: "Payment received ✅", description: "Your bundle is now active." });
            if (bundle?.msgCount) {
                const billingSettingsRef = doc(db, "settings", "billing");
                const docSnap = await getDoc(billingSettingsRef);
                const currentBalance = docSnap.exists() ? (docSnap.data().smsBalance || 0) : 0;
                const newBalance = currentBalance + bundle.msgCount;
                await setDoc(billingSettingsRef, { smsBalance: newBalance }, { merge: true });
            }
            onClose();
            clearInterval(intervalId);
        }
        if (json.status === "FAILED" || json.status === "EXPIRED") {
            toast({ variant: "destructive", title: "Payment failed" });
            onClose();
            clearInterval(intervalId);
        }
      } catch (e) {
        // Silently ignore polling errors
      }
    }, 3000);
    return () => clearInterval(intervalId);
  }, [invoice, open, bundle, onClose, toast]);


  async function handleSendOtp() {
    setLoading(true);
    try {
      const res = await generateOtp(mobileNumber);
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
            toast({ title: "Number verified ✅", description: "Proceeding to payment..." });
            setIsVerified(true);
            setCheckoutStep('process-payment');
            await handlePay(); // Automatically proceed to payment
        } else {
            throw new Error(res.message);
        }
    } catch(e: any) {
         toast({ variant: "destructive", title: "Verification Failed", description: e.message });
    } finally {
        setLoading(false);
    }
  }
  
  async function handlePay() {
    if (!bundle) return;
    setLoading(true);
    try {
      // 1. Create Invoice
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
      setInvoice(createdInvoice);

      // 2. Send Prompt
       await fetch("/api/send-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: createdInvoice.id, provider }),
      });
      
      toast({ title: "Prompt sent", description: "Check your phone and approve the payment." });
      setCheckoutStep('await-approval');

    } catch (e: any) {
       toast({ variant: "destructive", title: "Payment Error", description: e.message });
       setCheckoutStep('verify-number'); // Go back to first step on error
    } finally {
      setLoading(false);
    }
  }
  
  const renderContent = () => {
    switch (checkoutStep) {
      case 'verify-number':
        return (
          <>
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
                    <Button variant="outline" onClick={handleSendOtp} disabled={otpSent || loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Verify'}
                    </Button>
                  </div>
              </div>
              {otpSent && (
                  <div>
                      <Label>OTP</Label>
                      <div className="flex gap-2">
                          <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP"/>
                      </div>
                  </div>
              )}
            </div>
            <Button className="w-full mt-8 bg-red-600 hover:bg-red-700 text-white" size="lg" onClick={handleVerifyOtp} disabled={loading || !otpSent || otp.length < 4}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirm OTP & Pay'}
            </Button>
          </>
        );

      case 'process-payment':
        return (
          <div className="flex flex-col items-center justify-center text-center space-y-4 py-8 h-[250px]">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="font-semibold text-lg">Processing Payment...</p>
            <p className="text-sm text-muted-foreground">
                Generating reference and sending payment prompt to your phone.
            </p>
          </div>
        );

      case 'await-approval':
        return (
          <div className="flex flex-col items-center justify-center text-center space-y-4 py-8 h-[250px]">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
            <p className="font-semibold text-lg">Approve Payment...</p>
            <p className="text-sm text-muted-foreground">
                Please check your phone and enter your PIN to approve the transaction.
            </p>
            <Button 
                size="lg" 
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={onClose}
            >
                Close
            </Button>
          </div>
        );
    }
  }


  if (!bundle) return null;

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
            
            {renderContent()}

            <div className="text-center mt-4 text-xs text-muted-foreground">
                Powered by <span className="font-bold">CompusFlow</span> | Privacy | Terms
            </div>
          </div>
          
          {/* Right side: Invoice Details */}
          <div className="bg-[#EBF3FF] p-8 space-y-6">
             <Image src="https://picsum.photos/100/40" width={100} height={40} alt="Frog Logo" data-ai-hint="logo" />
            
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
                        <Image src="https://picsum.photos/16/16" width={16} height={16} alt="frog icon" data-ai-hint="logo" />
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
