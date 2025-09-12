
'use client'

import React, { useEffect, useState } from 'react';
import { useSchoolInfo } from '@/context/school-info-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Terminal } from 'lucide-react';
import Link from 'next/link';
import { sendSms } from '@/lib/frog-api';

export default function SubscriptionNotifier() {
    const { schoolInfo } = useSchoolInfo();
    const [showAlert, setShowAlert] = useState(false);

    useEffect(() => {
        if (schoolInfo?.currentPlan === 'free' || !schoolInfo?.currentPlan) {
            return; // Don't show notifications for free plan
        }

        const today = new Date();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const daysLeft = endOfMonth.getDate() - today.getDate();

        if (daysLeft <= 10 && daysLeft >= 0) {
            const lastNotified = localStorage.getItem('lastRenewalNotification');
            const todayStr = today.toISOString().split('T')[0];

            if (lastNotified !== todayStr) {
                setShowAlert(true);
                // Send SMS reminder
                const message = 'A client\'s monthly subscription is due for renewal soon. Please follow up.';
                sendSms(['0536282694'], message, schoolInfo.systemId);
                localStorage.setItem('lastRenewalNotification', todayStr);
            }
        }
    }, [schoolInfo]);

    if (!showAlert) {
        return null;
    }

    return (
        <Alert variant="destructive" className="mb-6">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Subscription Renewal Reminder</AlertTitle>
            <AlertDescription>
                Your monthly subscription is due for renewal soon. To avoid being downgraded to the Free Tier, please visit the billing page. 
                For yearly payment options, please contact support.
                <Button asChild variant="link" className="p-0 h-auto ml-2">
                    <Link href="/billing">Go to Billing</Link>
                </Button>
            </AlertDescription>
        </Alert>
    );
}
