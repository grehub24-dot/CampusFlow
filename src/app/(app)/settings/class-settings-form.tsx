
'use client'

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { SchoolClass } from '@/types';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().min(1, 'Class name is required.'),
  category: z.enum(['Creche', 'Nursery', 'Kindergarten', 'Basic', 'JHS']),
});

export type FormValues = z.infer<typeof formSchema>;

type ClassFormProps = {
    onSubmit: SubmitHandler<FormValues>;
    defaultValues?: SchoolClass;
}

export function ClassForm({ onSubmit, defaultValues }: ClassFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: defaultValues?.name || '',
        category: defaultValues?.category,
    }
  });

  React.useEffect(() => {
    form.reset({
        name: defaultValues?.name || '',
        category: defaultValues?.category,
    })
  }, [defaultValues, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Class Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Basic 1" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select category..." />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Creche">Creche</SelectItem>
                                <SelectItem value="Nursery">Nursery</SelectItem>
                                <SelectItem value="Kindergarten">Kindergarten</SelectItem>
                                <SelectItem value="Basic">Basic</SelectItem>
                                <SelectItem value="JHS">JHS (Junior High)</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <div className="flex justify-end">
          <Button type="submit">
            {defaultValues ? 'Save Changes' : 'Add Class'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
