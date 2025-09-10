
'use client'

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { IntegrationSettings } from '@/types';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  frogApiKey: z.string().optional(),
  frogSenderId: z.string().optional(),
  frogUsername: z.string().optional(),
  naloMerchantId: z.string().optional(),
  naloUsername: z.string().optional(),
  naloPassword: z.string().optional(),
  smsOnAdmission: z.boolean().default(false),
  smsOnPayment: z.boolean().default(false),
  smsOnFeeReminder: z.boolean().default(false),
});

export type FormValues = z.infer<typeof formSchema>;

type IntegrationsFormProps = {
    onSubmit: SubmitHandler<FormValues>;
    defaultValues?: IntegrationSettings;
    isSubmitting: boolean;
}

export function IntegrationsForm({ onSubmit, defaultValues, isSubmitting }: IntegrationsFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      frogApiKey: defaultValues?.frogApiKey || '',
      frogSenderId: defaultValues?.frogSenderId || '',
      frogUsername: defaultValues?.frogUsername || '',
      naloMerchantId: defaultValues?.naloMerchantId || '',
      naloUsername: defaultValues?.naloUsername || '',
      naloPassword: defaultValues?.naloPassword || '',
      smsOnAdmission: defaultValues?.smsOnAdmission || false,
      smsOnPayment: defaultValues?.smsOnPayment || false,
      smsOnFeeReminder: defaultValues?.smsOnFeeReminder || false,
    }
  });

  React.useEffect(() => {
    form.reset({
      frogApiKey: defaultValues?.frogApiKey || '',
      frogSenderId: defaultValues?.frogSenderId || '',
      frogUsername: defaultValues?.frogUsername || '',
      naloMerchantId: defaultValues?.naloMerchantId || '',
      naloUsername: defaultValues?.naloUsername || '',
      naloPassword: defaultValues?.naloPassword || '',
      smsOnAdmission: defaultValues?.smsOnAdmission || false,
      smsOnPayment: defaultValues?.smsOnPayment || false,
      smsOnFeeReminder: defaultValues?.smsOnFeeReminder || false,
    })
  }, [defaultValues, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        
        <Card className="border-2 border-dashed shadow-none">
            <CardHeader><CardTitle>Frog SMS API</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <FormField control={form.control} name="frogUsername" render={({ field }) => (<FormItem><FormLabel>Username</FormLabel><FormControl><Input placeholder="Enter your Frog API Username" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="frogApiKey" render={({ field }) => (<FormItem><FormLabel>API Key</FormLabel><FormControl><Input type="password" placeholder="Enter your Frog API Key" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="frogSenderId" render={({ field }) => (<FormItem><FormLabel>Sender ID</FormLabel><FormControl><Input placeholder="e.g., CampusFlow" {...field} /></FormControl><FormDescription>The name that appears as the sender of the SMS.</FormDescription><FormMessage /></FormItem>)} />
            </CardContent>
        </Card>

        <Card className="border-2 border-dashed shadow-none">
            <CardHeader><CardTitle>Nalo Momo Pay API</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <FormField control={form.control} name="naloMerchantId" render={({ field }) => (<FormItem><FormLabel>Merchant ID</FormLabel><FormControl><Input placeholder="e.g., NPS_000001" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="naloUsername" render={({ field }) => (<FormItem><FormLabel>Username</FormLabel><FormControl><Input placeholder="Enter your Nalo Username" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="naloPassword" render={({ field }) => (<FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="Enter your Nalo Password" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Automated SMS Notifications</CardTitle>
            <CardDescription>Enable or disable automated SMS messages for key events. This requires the Frog SMS API to be configured above.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <FormField control={form.control} name="smsOnAdmission" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">New Student Admission</FormLabel><FormDescription>Send a welcome SMS to the guardian when a new student is admitted.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
             <FormField control={form.control} name="smsOnPayment" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">Payment Confirmation</FormLabel><FormDescription>Send an SMS receipt to the guardian after a payment is recorded.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
             <FormField control={form.control} name="smsOnFeeReminder" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel className="text-base">Fee Reminders</FormLabel><FormDescription>Allow sending of SMS reminders for outstanding fee balances.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
          </CardContent>
        </Card>
        
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

    