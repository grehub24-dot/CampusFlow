
'use client'

import React from 'react';
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { SubmitHandler } from 'react-hook-form';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { BillingSettingsForm, type FormValues } from './billing-settings-form';
import { Button } from '@/components/ui/button';

export function BillingSettings() {
    const [settings, setSettings] = React.useState<any>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        const settingsDocRef = doc(db, "settings", "billing");
        const unsubscribe = onSnapshot(settingsDocRef, (doc) => {
            if (doc.exists()) {
                setSettings(doc.data());
            } else {
                setSettings(null); // No settings found
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching billing settings:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch billing settings." });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);
    
    const onSubmit: SubmitHandler<FormValues> = async (values) => {
        setIsSubmitting(true);
        try {
            const settingsDocRef = doc(db, "settings", "billing");
            await setDoc(settingsDocRef, values, { merge: true });
            toast({
                title: 'Settings Saved',
                description: 'Your billing settings have been successfully saved.',
            });
        } catch (error) {
            console.error("Error saving settings: ", error);
            toast({
                variant: "destructive",
                title: "Save Error",
                description: "Could not save settings. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Subscription Management</CardTitle>
                    <CardDescription>View your current plan and manage your subscription.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                            <p className="font-semibold">Current Plan: <span className="text-primary">Pro Tier</span></p>
                            <p className="text-sm text-muted-foreground">Renews on: December 31, 2024</p>
                        </div>
                        <Button>Manage Subscription</Button>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Invoice Settings</CardTitle>
                    <CardDescription>Customize the appearance and content of your invoices and receipts.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-8 w-1/4" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : (
                        <BillingSettingsForm 
                            onSubmit={onSubmit} 
                            defaultValues={settings || undefined}
                            isSubmitting={isSubmitting}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

