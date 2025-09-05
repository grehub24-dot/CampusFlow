
'use client'

import React from 'react';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { AdmissionSettings as AdmissionSettingsType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';


const formSchema = z.object({
  prefix: z.string().optional(),
  nextNumber: z.coerce.number().min(1, 'Next number must be at least 1.').optional(),
  padding: z.coerce.number().min(0, "Padding cannot be negative.").max(10, "Padding cannot be more than 10.").optional(),
});

type FormValues = z.infer<typeof formSchema>;


function AdmissionSettingsForm({ onSubmit, defaultValues, isSubmitting }: { onSubmit: SubmitHandler<FormValues>, defaultValues?: FormValues, isSubmitting: boolean }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prefix: defaultValues?.prefix || 'ADM',
      nextNumber: defaultValues?.nextNumber || 1,
      padding: defaultValues?.padding || 4,
    }
  });
  
  React.useEffect(() => {
    form.reset({
      prefix: defaultValues?.prefix || 'ADM',
      nextNumber: defaultValues?.nextNumber || 1,
      padding: defaultValues?.padding || 4,
    })
  }, [defaultValues, form]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="prefix"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID Prefix</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., ADM-" {...field} />
                </FormControl>
                <FormDescription>The prefix for all admission IDs.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nextNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Next Number</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                 <FormDescription>The next number in the sequence.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="padding"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number Padding</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                 <FormDescription>e.g., 4 would result in ADM-0001.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </form>
    </Form>
  )
}


export function AdmissionSettings() {
    const [settings, setSettings] = React.useState<AdmissionSettingsType | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        const settingsDocRef = doc(db, "settings", "admission");
        const unsubscribe = onSnapshot(settingsDocRef, (doc) => {
            if (doc.exists()) {
                setSettings(doc.data() as AdmissionSettingsType);
            } else {
                setSettings(null); // No settings found
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
                <CardTitle>Student ID Generation</CardTitle>
                <CardDescription>Configure the format for automatically generated student admission IDs.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-4">
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
