
'use client'

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AdmissionSettings } from '@/types';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const formSchema = z.object({
  prefix: z.string().min(1, 'Prefix is required.'),
  padding: z.coerce.number().min(1, 'Padding must be at least 1').max(10, 'Padding cannot exceed 10'),
});

export type FormValues = z.infer<typeof formSchema>;

type AdmissionSettingsFormProps = {
    onSubmit: SubmitHandler<FormValues>;
    defaultValues?: AdmissionSettings;
    isSubmitting: boolean;
}

export function AdmissionSettingsForm({ onSubmit, defaultValues, isSubmitting }: AdmissionSettingsFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prefix: defaultValues?.prefix || 'ADM',
      padding: defaultValues?.padding || 4,
    }
  });

  React.useEffect(() => {
    form.reset({
      prefix: defaultValues?.prefix || 'ADM',
      padding: defaultValues?.padding || 4,
    })
  }, [defaultValues, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="prefix"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>ID Prefix</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., ADM-" {...field} />
                    </FormControl>
                    <FormDescription>The text that appears before the number.</FormDescription>
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
                        <Input type="number" placeholder="e.g., 4" {...field} />
                    </FormControl>
                     <FormDescription>Total length of the number part (e.g., 4 becomes 0001).</FormDescription>
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
