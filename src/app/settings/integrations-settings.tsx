
'use client'

import React from 'react';
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { IntegrationSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';
import type { SubmitHandler } from 'react-hook-form';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { IntegrationsForm, type FormValues } from './integrations-form';
import { Skeleton } from '@/components/ui/skeleton';

export function IntegrationsSettings() {
    const [settings, setSettings] = React.useState<IntegrationSettings | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        const settingsDocRef = doc(db, "settings", "integrations");
        const unsubscribe = onSnapshot(settingsDocRef, (doc) => {
            if (doc.exists()) {
                setSettings(doc.data() as IntegrationSettings);
            } else {
                setSettings(null); // No settings found
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching integration settings:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch integration settings." });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);
    
    const onSubmit: SubmitHandler<FormValues> = async (values) => {
        setIsSubmitting(true);
        try {
            const settingsDocRef = doc(db, "settings", "integrations");
            await setDoc(settingsDocRef, values, { merge: true });
            toast({
                title: 'Settings Saved',
                description: 'Your integration settings have been successfully saved.',
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
        <Card>
            <CardHeader>
                <CardTitle>API Integrations</CardTitle>
                <CardDescription>Manage API keys and settings for third-party services.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : (
                    <IntegrationsForm 
                        onSubmit={onSubmit} 
                        defaultValues={settings || undefined}
                        isSubmitting={isSubmitting}
                    />
                )}
            </CardContent>
        </Card>
    );
}
