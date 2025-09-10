'use client'

import React, { useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Check, ShieldCheck } from 'lucide-react';
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
    description: 'Perfect for getting started and exploring the platform.',
    features: [
      'Up to 50 students',
      'Basic reporting',
      'Community support',
      '1 user account',
    ],
    isCurrent: false,
  },
  {
    name: 'Pro Tier',
    price: 'GHS 250',
    frequency: '/month',
    description: 'For growing schools that need more power and support.',
    features: [
      'Up to 500 students',
      'AI-powered reports',
      'SMS & Email integrations',
      '5 user accounts',
      'Priority support',
    ],
    isCurrent: true,
  },
  {
    name: 'Enterprise',
    price: 'Contact Us',
    frequency: '',
    description: 'Custom solutions for large institutions and school districts.',
    features: [
      'Unlimited students',
      'Custom integrations',
      'Dedicated account manager',
      'On-premise options',
      '24/7 support',
    ],
    isCurrent: false,
  }
];

function SubscriptionCard({ plan, onSelect }: { plan: typeof subscriptionPlans[0], onSelect: (planName: string) => void }) {
  return (
    <Card className={cn("flex flex-col", plan.isCurrent && "border-primary border-2")}>
      <CardHeader className={cn(plan.isCurrent && "bg-primary/10")}>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
            </div>
            {plan.isCurrent && <ShieldCheck className="h-6 w-6 text-primary" />}
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col pt-6">
        <div className="mb-6">
          <span className="text-4xl font-bold">{plan.price}</span>
          <span className="text-muted-foreground">{plan.frequency}</span>
        </div>
        <ul className="space-y-3 mb-8 flex-grow">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
        <Button 
          className="w-full mt-auto" 
          disabled={plan.isCurrent || plan.price === 'Contact Us'}
          onClick={() => onSelect(plan.name)}
        >
          {plan.isCurrent ? 'Current Plan' : 'Choose Plan'}
        </Button>
      </CardContent>
    </Card>
  );
}


export default function BillingPage() {
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

    return (
        <>
            <PageHeader
                title="Nexora Cloud Subscriptions"
                description="Choose the right plan for your school's needs."
            />
            <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
              {subscriptionPlans.map((plan) => (
                <SubscriptionCard key={plan.name} plan={plan} onSelect={setSelectedPlan} />
              ))}
            </div>

            <Dialog open={!!selectedPlan} onOpenChange={(isOpen) => !isOpen && setSelectedPlan(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Your Upgrade</DialogTitle>
                        <DialogDescription>
                            You are about to upgrade to the <strong>{selectedPlan}</strong> plan. A member of our team will contact you shortly to complete the process.
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
