
'use client'

import React from 'react';
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { AdmissionSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';
import type { SubmitHandler } from 'react-hook-form';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { AdmissionSettingsForm, type FormValues } from './admission-settings-form';

export function AdmissionSettings() {
    const [settings, setSettings] = React.useState<AdmissionSettings | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        const settingsDocRef = doc(db, "settings", "admission");
        const unsubscribe = onSnapshot(settingsDocRef, (doc) => {
            if (doc.exists()) {
                setSettings(doc.data() as AdmissionSettings);
            } else {
                setSettings(null); // No settings found, will use defaults
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching admission settings:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch admission settings." });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);
    
    const onSubmit: SubmitHandler<FormValues> = async (values) => {
        setIsSubmitting(true);
        try {
            const settingsDocRef = doc(db, "settings", "admission");
            await setDoc(settingsDocRef, values, { merge: true });
            toast({
                title: 'Settings Saved',
                description: 'Your admission settings have been successfully saved.',
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
                <CardTitle>Admission ID Settings</CardTitle>
                <CardDescription>Define the format for auto-generated student admission IDs.</CardDescription>
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
                    <AdmissionSettingsForm
                        onSubmit={onSubmit} 
                        defaultValues={settings || undefined}
                        isSubmitting={isSubmitting}
                    />
                )}
            </CardContent>
        </Card>
    );
}
