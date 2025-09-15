
'use client'

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import type { User } from '@/types';


import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.').optional().or(z.literal('')),
  role: z.enum(['Admin', 'Receptionist', 'Accountant', 'Support']),
  payrollId: z.string().optional(),
});

export type FormValues = z.infer<typeof formSchema>;

type UserFormProps = {
    onSubmit: SubmitHandler<FormValues>;
    isSubmitting: boolean;
    isSupportForm?: boolean;
    defaultValues?: User & { payrollId?: string };
}

export function UserForm({ onSubmit, isSubmitting, isSupportForm = false, defaultValues }: UserFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: defaultValues?.name || '',
        email: defaultValues?.email || '',
        password: '',
        role: isSupportForm ? 'Support' : (defaultValues?.role || 'Receptionist'),
        payrollId: defaultValues?.payrollId || '',
    }
  });
  
  React.useEffect(() => {
    if (defaultValues) {
        form.reset({
            name: defaultValues.name || '',
            email: defaultValues.email || '',
            password: '',
            role: isSupportForm ? 'Support' : (defaultValues.role || 'Receptionist'),
            payrollId: defaultValues.payrollId || '',
        })
    }
  }, [defaultValues, isSupportForm, form]);

  const handleSubmit: SubmitHandler<FormValues> = (values) => {
    const dataToSubmit = { ...values };
    // If we're editing and the password field is empty, don't include it in the submission
    if (defaultValues && !values.password) {
      delete dataToSubmit.password;
    }
    onSubmit(dataToSubmit);
  }

  const isEditing = !!defaultValues;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl><Input type="email" placeholder="e.g., jane.doe@school.com" {...field} disabled={isEditing} /></FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        {isEditing && defaultValues?.payrollId && (
            <FormField
                control={form.control}
                name="payrollId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Payroll ID</FormLabel>
                        <FormControl><Input {...field} readOnly disabled /></FormControl>
                    </FormItem>
                )}
            />
        )}
        {!isEditing && (
            <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        )}
        <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSupportForm}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="Receptionist">Receptionist</SelectItem>
                            <SelectItem value="Accountant">Accountant</SelectItem>
                            <SelectItem value="Support">Support</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             {isEditing ? 'Save Changes' : 'Create User'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
