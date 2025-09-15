
'use client'

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PayrollSettings } from '@/types';
import { useAuth } from '@/context/auth-context';
import { logActivity } from '@/lib/activity-logger';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const taxBracketSchema = z.object({
  from: z.coerce.number().min(0),
  to: z.coerce.number().optional(),
  rate: z.coerce.number().min(0).max(100),
});

const formSchema = z.object({
  ssnitEmployeeRate: z.coerce.number().min(0).max(100),
  ssnitEmployerRate: z.coerce.number().min(0).max(100),
  payeTaxBrackets: z.array(taxBracketSchema),
});

type FormValues = z.infer<typeof formSchema>;

const defaultTaxBrackets: z.infer<typeof taxBracketSchema>[] = [
    { from: 0, to: 490, rate: 0 },
    { from: 490, to: 600, rate: 5 },
    { from: 600, to: 730, rate: 10 },
    { from: 730, to: 3000, rate: 17.5 },
    { from: 3000, to: 16491.67, rate: 25 },
    { from: 16491.67, to: 50000, rate: 30 },
    { from: 50000, rate: 35 },
];

export function PayrollSettings() {
    const [settings, setSettings] = useState<PayrollSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();
    
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            ssnitEmployeeRate: 5.5,
            ssnitEmployerRate: 13,
            payeTaxBrackets: defaultTaxBrackets,
        }
    });
    
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "payeTaxBrackets"
    });

    useEffect(() => {
        const settingsDocRef = doc(db, "settings", "payroll");
        const unsubscribe = onSnapshot(settingsDocRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data() as PayrollSettings;
                setSettings(data);
                form.reset({
                    ssnitEmployeeRate: data.ssnitEmployeeRate,
                    ssnitEmployerRate: data.ssnitEmployerRate,
                    payeTaxBrackets: data.payeTaxBrackets,
                });
            } else {
                 form.reset({
                    ssnitEmployeeRate: 5.5,
                    ssnitEmployerRate: 13,
                    payeTaxBrackets: defaultTaxBrackets,
                });
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [form]);

    const onSubmit: SubmitHandler<FormValues> = async (values) => {
        setIsSubmitting(true);
        try {
            const settingsDocRef = doc(db, "settings", "payroll");
            await setDoc(settingsDocRef, values, { merge: true });
            await logActivity(user, 'Payroll Settings Updated', 'Updated SSNIT and PAYE tax settings.');
            toast({
                title: 'Settings Saved',
                description: 'Payroll settings have been successfully updated.',
            });
        } catch (error) {
            console.error("Error saving payroll settings: ", error);
            toast({
                variant: "destructive",
                title: "Save Error",
                description: "Could not save settings.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isLoading) {
        return <Skeleton className="h-96 w-full" />
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Payroll Settings</CardTitle>
                <CardDescription>Manage statutory deduction rates for payroll processing.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">SSNIT Contribution Rates</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="ssnitEmployeeRate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Employee Contribution Rate (%)</FormLabel>
                                            <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="ssnitEmployerRate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Employer Contribution Rate (%)</FormLabel>
                                            <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                         <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-medium">Income Tax (PAYE) Brackets (Monthly)</h3>
                                    <p className="text-sm text-muted-foreground">Define the taxable income brackets and their corresponding tax rates.</p>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ from: 0, rate: 0 })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Bracket
                                </Button>
                            </div>
                             {fields.map((field, index) => (
                                <div key={field.id} className="flex items-end gap-2 p-2 border rounded-md">
                                    <FormField
                                        control={form.control}
                                        name={`payeTaxBrackets.${index}.from`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel className={cn(index !== 0 && "sr-only")}>From (GHS)</FormLabel>
                                                <FormControl><Input type="number" placeholder="From" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name={`payeTaxBrackets.${index}.to`}
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel className={cn(index !== 0 && "sr-only")}>To (GHS)</FormLabel>
                                                <FormControl><Input type="number" placeholder="To (optional)" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name={`payeTaxBrackets.${index}.rate`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className={cn(index !== 0 && "sr-only")}>Rate (%)</FormLabel>
                                                <FormControl><Input type="number" placeholder="Rate" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Payroll Settings
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
