
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
      paymentTerms: defaultValues?.paymentTerms || 'Payment is due by {{dueDate}}.\nLate fee of 2% per month may apply after the due date.\nPlease quote the invoice number when making payments.',
      paymentMethods: defaultValues?.paymentMethods || 'Mobile Money\n\nDial <strong>+233 536 282 694</strong>.\nRemember to use the invoice number as reference.',
    }
  });

  React.useEffect(() => {
    form.reset({
      paymentTerms: defaultValues?.paymentTerms || 'Payment is due by {{dueDate}}.\nLate fee of 2% per month may apply after the due date.\nPlease quote the invoice number when making payments.',
      paymentMethods: defaultValues?.paymentMethods || 'Mobile Money\n\nDial <strong>+233 536 282 694</strong>.\nRemember to use the invoice number as reference.',
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
                            <Textarea placeholder={'e.g. Payment is due by {{dueDate}}.'} {...field} rows={4}/>
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
                            <Textarea placeholder={'e.g. Dial *123# and use {{invoiceNumber}} as reference.'} {...field} rows={4}/>
                        </FormControl>
                        <FormDescription>This text will appear under the 'Payment Methods' section. Available placeholders: {'`{{invoiceNumber}}`'}</FormDescription>
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
