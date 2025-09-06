
'use client'

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  invoiceFooter: z.string().optional(),
  paymentTerms: z.string().optional(),
  paymentMethods: z.string().optional(),
});

export type FormValues = z.infer<typeof formSchema>;

type BillingSettingsFormProps = {
    onSubmit: SubmitHandler<FormValues>;
    defaultValues?: any;
    isSubmitting: boolean;
}

export function BillingSettingsForm({ onSubmit, defaultValues, isSubmitting }: BillingSettingsFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceFooter: defaultValues?.invoiceFooter || '',
      paymentTerms: defaultValues?.paymentTerms || '',
      paymentMethods: defaultValues?.paymentMethods || '',
    }
  });

  React.useEffect(() => {
    form.reset({
      invoiceFooter: defaultValues?.invoiceFooter || '',
      paymentTerms: defaultValues?.paymentTerms || '',
      paymentMethods: defaultValues?.paymentMethods || '',
    })
  }, [defaultValues, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        
        <Card className="border shadow-none">
            <CardHeader>
                <CardTitle>Invoice & Receipt Customization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="paymentTerms"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Payment Terms</FormLabel>
                        <FormControl>
                            <Textarea placeholder="e.g. Payment is due by {{dueDate}}." {...field} rows={4}/>
                        </FormControl>
                        <FormDescription>This text will appear under the 'Payment Terms' section. Available placeholders: {'`{{dueDate}}`'}</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="paymentMethods"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Payment Methods</FormLabel>
                        <FormControl>
                            <Textarea placeholder="e.g. Dial *123# and use {{invoiceNumber}} as reference." {...field} rows={4}/>
                        </FormControl>
                        <FormDescription>This text will appear under the 'Payment Methods' section. Available placeholders: {'`{{invoiceNumber}}`'}</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="invoiceFooter"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Invoice Footer Text</FormLabel>
                        <FormControl>
                            <Textarea placeholder="e.g. Thank you for your business!" {...field} />
                        </FormControl>
                        <FormDescription>This text will appear at the bottom of all invoices and receipts.</FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
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
