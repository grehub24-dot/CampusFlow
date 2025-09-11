

'use client'

import React, { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Check, ShieldCheck, DatabaseZap, Mail, Scaling, MessageCircle, X, MessageSquareText, MailOpen, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { doc, onSnapshot, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { IntegrationSettings } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { sendSms } from '@/lib/frog-api';


const whyNexoraFeatures = [
    {
        icon: DatabaseZap,
        title: "Zero Data Loss",
        description: "Automated and secure backups to protect your valuable school data."
    },
    {
        icon: Mail,
        title: "Flexible Communication",
        description: "Built-in email tools (SMS optional) to keep parents informed."
    },
    {
        icon: Scaling,
        title: "Scale With Confidence",
        description: "From 50 to 50,000 students, our platform grows with you."
    },
    {
        icon: MessageCircle,
        title: "Local Support",
        description: "We understand the unique needs and challenges of Ghanaian schools."
    }
]

const enterpriseEmailBody = `Dear CampusFlow Team,

We are reaching out to express interest in your Enterprise package for large institutions. The features such as unlimited students, real-time cloud backup, advanced email & WhatsApp integration, and full API/system integration align closely with our requirements.

We would like to:
- Understand your pricing and contract options
- Explore the infrastructure setup
- Schedule a demo session to evaluate suitability for our institution

Kindly share the next steps and available demo dates.

Thank you, and we look forward to your response.

Best regards,
[Your Name]
[Your Institution]
[Your Phone Number] | [Your Email Address]`;

const enterpriseSmsBody = `Hello CampusFlow Team, We’re interested in your Enterprise plan for our institution. Could you kindly share details on pricing, setup, and demo availability?`;


function SubscriptionCard({ plan, onSelect, isCurrent, isProcessing }: { plan: any, onSelect: (plan: any) => void, isCurrent: boolean, isProcessing: boolean }) {
  return (
    <Card className={cn(
      "flex flex-col", 
      isCurrent && "border-primary border-2 shadow-lg",
      plan.recommended && "border-amber-500 border-2"
      )}>
      <CardHeader className={cn(isCurrent && "bg-primary/10", plan.recommended && "bg-amber-500/10")}>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="pt-1">{plan.description}</CardDescription>
            </div>
            {isCurrent && <ShieldCheck className="h-6 w-6 text-primary" />}
            {plan.recommended && !isCurrent && <span className="text-xs font-semibold bg-amber-500 text-white px-2 py-1 rounded-full">Recommended</span>}
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col pt-6">
        <div className="mb-6">
          <span className="text-4xl font-bold">{plan.price}</span>
          <span className="text-muted-foreground">{plan.frequency}</span>
        </div>
        <ul className="space-y-3 mb-8 flex-grow">
          {plan.features.map((feature: any) => (
            <li key={feature.text} className="flex items-start gap-3">
              {feature.included ? <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /> : <X className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />}
              <span className={cn("text-sm", !feature.included && "text-muted-foreground line-through")}>{feature.text}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground italic mt-auto pt-4">{plan.idealFor}</p>
      </CardContent>
       <CardFooter>
         <Button 
          className="w-full" 
          disabled={isProcessing && !isCurrent}
          variant={plan.buttonVariant || 'default'}
          onClick={() => onSelect(plan)}
        >
          {isCurrent ? 'Manage Subscription' : plan.buttonText}
        </Button>
      </CardFooter>
    </Card>
  );
}


export default function BillingPage() {
    const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
    const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
    const [currentPlan, setCurrentPlan] = useState('pro'); // Default to pro for demo
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();
    const router = useRouter();


    useEffect(() => {
        const billingSettingsRef = doc(db, "settings", "billing");
        const unsubscribe = onSnapshot(billingSettingsRef, (doc) => {
            if (doc.exists() && doc.data().currentPlan) {
                setCurrentPlan(doc.data().currentPlan);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const subscriptionPlans = [
      {
        id: 'free',
        name: 'Free Tier',
        priceGHS: 0,
        price: 'GHS 0',
        frequency: '/month',
        description: 'Get started and explore the Nexora platform.',
        features: [
          { text: 'Supports up to 50 students', included: true },
          { text: 'Basic SMS notifications (limited to 50/month)', included: true },
          { text: 'Community support', included: true },
          { text: '1 user account', included: true },
          { text: 'Automatic cloud backup', included: false },
          { text: 'Email notifications', included: false },
          { text: 'WhatsApp integration', included: false },
          { text: 'Priority support', included: false },
        ],
        idealFor: 'Ideal for small schools testing the platform.',
        buttonText: 'Choose Plan',
        buttonVariant: 'outline' as const,
      },
      {
        id: 'starter',
        name: 'Starter Tier',
        priceGHS: 200,
        price: 'GHS 200',
        frequency: '/month',
        description: 'For growing schools that need more control.',
        features: [
          { text: 'Supports up to 200 students', included: true },
          { text: 'Weekly cloud backup (app + database)', included: true },
          { text: 'Basic Email notifications (50/month)', included: true },
          { text: 'Email-based support (48h response)', included: true },
          { text: 'Up to 2 user accounts', included: true },
          { text: 'WhatsApp integration', included: false },
          { text: 'Priority support', included: false },
        ],
        idealFor: 'Best value for mid-sized schools managing termly data.',
        buttonText: 'Upgrade Now',
        buttonVariant: 'default' as const,
        recommended: true,
      },
      {
        id: 'pro',
        name: 'Pro Tier',
        priceGHS: 400,
        price: 'GHS 400',
        frequency: '/month',
        description: 'For schools ready to scale operations.',
        features: [
          { text: 'Supports up to 500 students', included: true },
          { text: 'Daily cloud backup (app + database)', included: true },
          { text: 'Full email integration (1,000/month)', included: true },
          { text: 'Full WhatsApp integration', included: true },
          { text: 'Priority support (Email + WhatsApp)', included: true },
          { text: 'Up to 5 user accounts', included: true },
        ],
        idealFor: 'Great for schools with multiple departments.',
        buttonText: 'Manage Subscription',
        buttonVariant: 'default' as const,
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        priceGHS: 0,
        price: 'Contact Us',
        frequency: '',
        description: 'Custom infrastructure for large institutions.',
        features: [
          { text: 'Unlimited students', included: true },
          { text: 'Real-time cloud backup', included: true },
          { text: 'Advanced email & WhatsApp integration', included: true },
          { text: 'Dedicated account manager', included: true },
          { text: 'Unlimited user accounts', included: true },
          { text: 'Full API & system integration', included: true },
        ],
        idealFor: 'Tailored to your institution’s specific needs.',
        buttonText: 'Request a Demo',
        buttonVariant: 'outline' as const,
      }
    ];

    const handleSelectPlan = (plan: any) => {
        if (plan.id === 'enterprise') {
            setIsContactDialogOpen(true);
        } else if (plan.priceGHS > 0) {
             router.push(`/billing/purchase?bundle=${plan.name} Subscription&credits=${plan.id}&price=${plan.priceGHS}`);
        } else {
            setSelectedPlan(plan);
        }
    };
    
    const handleContact = async (method: 'sms' | 'email') => {
        setIsProcessing(true);
        try {
            if (method === 'email') {
                await addDoc(collection(db, "mail"), {
                    to: ['nexorasystems25@gmail.com'],
                    message: {
                        subject: "Request for Enterprise Demo & Pricing Details",
                        html: enterpriseEmailBody.replace(/\n/g, '<br>'),
                    },
                });
                toast({
                    title: "Email Request Sent",
                    description: "Your inquiry has been sent. We will contact you shortly."
                });

            } else { // SMS
                const result = await sendSms(['0536282694'], enterpriseSmsBody);
                if (result.success) {
                    toast({
                        title: "Request Sent",
                        description: "Your request has been sent via SMS. We will contact you shortly."
                    });
                } else {
                    throw new Error(result.error || "Failed to send SMS.");
                }
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Request Failed",
                description: error.message
            });
        } finally {
            setIsProcessing(false);
            setIsContactDialogOpen(false);
        }
    }


    if (isLoading) {
        return (
            <div className="space-y-6">
                <PageHeader
                    title="🚀 Nexora Cloud Subscriptions"
                    description="Reliable, secure, and scalable cloud services for schools of all sizes."
                />
                <div className="grid md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                    <Skeleton className="h-[400px] w-full" />
                    <Skeleton className="h-[400px] w-full" />
                    <Skeleton className="h-[400px] w-full" />
                    <Skeleton className="h-[400px] w-full" />
                </div>
            </div>
        )
    }

    return (
        <>
            <PageHeader
                title="🚀 Nexora Cloud Subscriptions"
                description="Reliable, secure, and scalable cloud services for schools of all sizes."
            />
            <div className="grid md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              {subscriptionPlans.map((plan) => (
                <SubscriptionCard 
                    key={plan.id} 
                    plan={plan} 
                    onSelect={handleSelectPlan}
                    isCurrent={currentPlan === plan.id}
                    isProcessing={isLoading}
                />
              ))}
            </div>

            <Card className="mt-12">
                <CardHeader>
                    <CardTitle>🔐 Why Nexora?</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {whyNexoraFeatures.map(feature => (
                        <div key={feature.title} className="flex items-start gap-4">
                            <feature.icon className="h-8 w-8 text-primary mt-1" />
                            <div>
                                <h3 className="font-semibold">{feature.title}</h3>
                                <p className="text-sm text-muted-foreground">{feature.description}</p>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
            
            <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Contact Us for Enterprise Plan</DialogTitle>
                        <DialogDescription>
                            Choose your preferred method to contact our sales team. We will respond shortly.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><MailOpen className="h-5 w-5" /> Email</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Textarea readOnly value={enterpriseEmailBody} className="h-48 text-xs" />
                                <Button className="w-full mt-4" onClick={() => handleContact('email')} disabled={isProcessing}>
                                     {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Send via Email
                                </Button>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><MessageSquareText className="h-5 w-5" /> SMS</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Textarea readOnly value={enterpriseSmsBody} className="h-48 text-xs" />
                                <Button className="w-full mt-4" onClick={() => handleContact('sms')} disabled={isProcessing}>
                                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Send via SMS
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!selectedPlan && !isContactDialogOpen} onOpenChange={(isOpen) => !isOpen && setSelectedPlan(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Your Choice</DialogTitle>
                        <DialogDescription>
                            You are about to choose the <strong>{selectedPlan?.name}</strong> plan. A member of our team will contact you shortly to complete the process.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end pt-4">
                        <Button onClick={() => setSelectedPlan(null)}>Got it</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

    

      

    
