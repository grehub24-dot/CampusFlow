
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const formSchema = z.object({
  frogApiKey: z.string().optional(),
  frogSenderId: z.string().optional(),
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
    }
  });

  React.useEffect(() => {
    form.reset({
      frogApiKey: defaultValues?.frogApiKey || '',
      frogSenderId: defaultValues?.frogSenderId || '',
    })
  }, [defaultValues, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        
        <Card className="border-2 border-dashed shadow-none">
            <CardHeader>
                <CardTitle>Frog SMS API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField
                    control={form.control}
                    name="frogApiKey"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="Enter your Frog API Key" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="frogSenderId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Sender ID</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., CampusFlow" {...field} />
                        </FormControl>
                        <FormDescription>The name that appears as the sender of the SMS.</FormDescription>
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
