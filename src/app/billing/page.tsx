
'use client'

import React, { useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Check, ShieldCheck, DatabaseZap, Mail, Scaling, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const subscriptionPlans = [
  {
    name: 'Free Tier',
    price: 'GHS 0',
    frequency: '/month',
    description: 'Get started and explore the Nexora platform.',
    features: [
      'Supports up to 50 students',
      'Basic SMS notifications (limited to 50/month)',
      'Community support',
      '1 user account',
    ],
    idealFor: 'Ideal for small schools testing the platform.',
    isCurrent: false,
    buttonText: 'Choose Plan',
    buttonVariant: 'outline' as const,
  },
  {
    name: 'Starter Tier',
    price: 'GHS 200',
    frequency: '/month',
    description: 'Built for growing basic schools that need more control and reliability.',
    features: [
      'Supports up to 200 students',
      'Automatic cloud backup (app + database) — once per week',
      'Basic Email notifications (limited to 50/month)',
      'Email-based support (48h response)',
      'Up to 2 user accounts',
    ],
    idealFor: 'Best value for mid-sized schools managing termly data and communication.',
    isCurrent: false,
    buttonText: 'Upgrade Now',
    buttonVariant: 'default' as const,
    recommended: true,
  },
  {
    name: 'Pro Tier',
    price: 'GHS 400',
    frequency: '/month',
    description: 'For schools ready to scale operations and data management.',
    features: [
      'Supports up to 500 students',
      'Daily cloud backup (app + database, encrypted & secure)',
      'Full email integration (alerts, reports — up to 1,000/month)',
      'Full WhatsApp integration',
      'Priority support (Email + WhatsApp, 24–48h SLA)',
      'Up to 5 user accounts',
    ],
    idealFor: 'Great for schools with multiple departments or campuses.',
    isCurrent: true,
    buttonText: 'Current Plan',
    buttonVariant: 'default' as const,
  },
  {
    name: 'Enterprise',
    price: 'Contact Us',
    frequency: '',
    description: 'Custom infrastructure for large institutions, school groups, or districts.',
    features: [
      'Unlimited students',
      'Real-time cloud backup (app + database, secure offsite storage)',
      'Advanced email integration (parent-teacher comms, automated alerts — up to 10,000/month)',
      'Full WhatsApp integration',
      'Dedicated account manager + 24/7 support',
      'Unlimited user accounts',
      'Full API & system integration',
    ],
    idealFor: 'Tailored to your institution’s IT, compliance, and data security needs.',
    isCurrent: false,
    buttonText: 'Request a Demo',
    buttonVariant: 'outline' as const,
  }
];

function SubscriptionCard({ plan, onSelect }: { plan: typeof subscriptionPlans[0], onSelect: (planName: string) => void }) {
  return (
    <Card className={cn(
      "flex flex-col", 
      plan.isCurrent && "border-primary border-2 shadow-lg",
      plan.recommended && "border-amber-500 border-2"
      )}>
      <CardHeader className={cn(plan.isCurrent && "bg-primary/10", plan.recommended && "bg-amber-500/10")}>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="pt-1">{plan.description}</CardDescription>
            </div>
            {plan.isCurrent && <ShieldCheck className="h-6 w-6 text-primary" />}
            {plan.recommended && !plan.isCurrent && <span className="text-xs font-semibold bg-amber-500 text-white px-2 py-1 rounded-full">Recommended</span>}
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col pt-6">
        <div className="mb-6">
          <span className="text-4xl font-bold">{plan.price}</span>
          <span className="text-muted-foreground">{plan.frequency}</span>
        </div>
        <ul className="space-y-3 mb-8 flex-grow">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground italic mt-auto pt-4">{plan.idealFor}</p>
      </CardContent>
       <CardFooter>
         <Button 
          className="w-full" 
          disabled={plan.isCurrent}
          variant={plan.buttonVariant}
          onClick={() => onSelect(plan.name)}
        >
          {plan.buttonText}
        </Button>
      </CardFooter>
    </Card>
  );
}

const whyNexoraFeatures = [
    {
        icon: DatabaseZap,
        title: "Zero Data Loss",
        description: "Automated and secure backups to protect your valuable school data."
    },
    {
        icon: Mail,
        title: "Flexible Communication",
        description: "Built-in email and optional SMS tools to keep parents informed."
    },
    {
        icon: Scaling,
        title: "Scale With Confidence",
        description: "Our platform grows with you, from 50 to 50,000 students."
    },
    {
        icon: MessageCircle,
        title: "Local Support",
        description: "We understand the unique needs and challenges of Ghanaian schools."
    }
]


export default function BillingPage() {
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

    return (
        <>
            <PageHeader
                title="🚀 Nexora Cloud Subscriptions"
                description="Reliable, secure, and scalable cloud services for schools of all sizes."
            />
            <div className="grid md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              {subscriptionPlans.map((plan) => (
                <SubscriptionCard key={plan.name} plan={plan} onSelect={setSelectedPlan} />
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

            <Dialog open={!!selectedPlan} onOpenChange={(isOpen) => !isOpen && setSelectedPlan(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Your Choice</DialogTitle>
                        <DialogDescription>
                            You are about to choose the <strong>{selectedPlan}</strong> plan. A member of our team will contact you shortly to complete the process.
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
