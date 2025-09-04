
'use client'

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { FeeItem } from '@/types';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

const formSchema = z.object({
  name: z.string().min(1, 'Fee item name is required.'),
  isOptional: z.boolean().default(false),
  appliesTo: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one item.",
  }),
});

export type FormValues = z.infer<typeof formSchema>;

type FeeItemFormProps = {
    onSubmit: SubmitHandler<FormValues>;
    defaultValues?: FeeItem;
}

const appliesToItems = [
    { id: 'new', label: 'New Admissions' },
    { id: 'term1', label: 'Term 1 (Continuing)' },
    { id: 'term2_3', label: 'Term 2 & 3 (Continuing)' },
]

export function FeeItemForm({ onSubmit, defaultValues }: FeeItemFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: defaultValues?.name || '',
        isOptional: defaultValues?.isOptional || false,
        appliesTo: defaultValues?.appliesTo || [],
    }
  });

  React.useEffect(() => {
    form.reset({
        name: defaultValues?.name || '',
        isOptional: defaultValues?.isOptional || false,
        appliesTo: defaultValues?.appliesTo || [],
    })
  }, [defaultValues, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Fee Item Name</FormLabel>
                <FormControl>
                    <Input placeholder="e.g., School Fees" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        
         <FormField
            control={form.control}
            name="appliesTo"
            render={() => (
                <FormItem>
                <div className="mb-4">
                    <FormLabel className="text-base">Applies To</FormLabel>
                    <FormDescription>
                        Select when this fee item should be automatically applied to an invoice.
                    </FormDescription>
                </div>
                {appliesToItems.map((item) => (
                    <FormField
                    key={item.id}
                    control={form.control}
                    name="appliesTo"
                    render={({ field }) => {
                        return (
                        <FormItem
                            key={item.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                        >
                            <FormControl>
                            <Checkbox
                                checked={field.value?.includes(item.id)}
                                onCheckedChange={(checked) => {
                                return checked
                                    ? field.onChange([...(field.value || []), item.id])
                                    : field.onChange(
                                        field.value?.filter(
                                        (value) => value !== item.id
                                        )
                                    )
                                }}
                            />
                            </FormControl>
                            <FormLabel className="font-normal">
                            {item.label}
                            </FormLabel>
                        </FormItem>
                        )
                    }}
                    />
                ))}
                <FormMessage />
                </FormItem>
            )}
        />

        <FormField
            control={form.control}
            name="isOptional"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <FormLabel className="text-base">Optional Fee</FormLabel>
                        <FormDescription>
                            If toggled, this fee will not be checked by default and must be manually selected during payment.
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                </FormItem>
            )}
        />
        
        <div className="flex justify-end">
          <Button type="submit">
            {defaultValues ? 'Save Changes' : 'Add Fee Item'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
