
'use client'

import React from 'react';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { StaffMember } from '@/types';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Trash2 } from 'lucide-react';

const deductionSchema = z.object({
  name: z.string().min(1, "Deduction name is required"),
  amount: z.coerce.number().min(0, "Amount must be a positive number"),
});

const formSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  role: z.string().min(1, 'Role is required.'),
  grossSalary: z.coerce.number().min(0, 'Salary must be a positive number.'),
  paymentMethod: z.enum(['Bank', 'Mobile Money']),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  momoNumber: z.string().optional(),
  status: z.enum(['Active', 'Inactive']),
  deductions: z.array(deductionSchema).optional(),
}).refine(data => {
    if (data.paymentMethod === 'Bank') {
        return !!data.bankName && !!data.accountNumber;
    }
    return true;
}, {
    message: "Bank Name and Account Number are required for bank payments.",
    path: ["bankName"]
}).refine(data => {
    if (data.paymentMethod === 'Mobile Money') {
        return !!data.momoNumber;
    }
    return true;
}, {
    message: "Mobile Money number is required.",
    path: ["momoNumber"]
});

export type FormValues = z.infer<typeof formSchema>;

type StaffFormProps = {
    onSubmit: SubmitHandler<FormValues>;
    defaultValues?: StaffMember;
}

export function StaffForm({ onSubmit, defaultValues }: StaffFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: defaultValues?.name || '',
        role: defaultValues?.role || '',
        grossSalary: defaultValues?.grossSalary || 0,
        paymentMethod: defaultValues?.paymentMethod || undefined,
        bankName: defaultValues?.bankName || '',
        accountNumber: defaultValues?.accountNumber || '',
        momoNumber: defaultValues?.momoNumber || '',
        status: defaultValues?.status || 'Active',
        deductions: defaultValues?.deductions || [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "deductions"
  });

  const paymentMethod = form.watch('paymentMethod');

  React.useEffect(() => {
    form.reset({
        name: defaultValues?.name || '',
        role: defaultValues?.role || '',
        grossSalary: defaultValues?.grossSalary || 0,
        paymentMethod: defaultValues?.paymentMethod || undefined,
        bankName: defaultValues?.bankName || '',
        accountNumber: defaultValues?.accountNumber || '',
        momoNumber: defaultValues?.momoNumber || '',
        status: defaultValues?.status || 'Active',
        deductions: defaultValues?.deductions || [],
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
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Role / Position</FormLabel>
                    <FormControl><Input placeholder="e.g., Teacher" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="grossSalary"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Gross Annual Salary (GHS)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        <Separator />

        <div>
            <h3 className="text-lg font-medium mb-2">Payment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Payment Method</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select method..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Bank">Bank</SelectItem>
                                    <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {paymentMethod === 'Bank' && (
                    <>
                        <FormField control={form.control} name="bankName" render={({ field }) => (<FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="accountNumber" render={({ field }) => (<FormItem><FormLabel>Account Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </>
                )}
                {paymentMethod === 'Mobile Money' && (
                    <FormField control={form.control} name="momoNumber" render={({ field }) => (<FormItem><FormLabel>Mobile Money Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                )}
            </div>
        </div>

        <Separator />
        
        <div>
            <h3 className="text-lg font-medium mb-4">Custom Deductions</h3>
            <div className="space-y-4">
            {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-2">
                <FormField
                    control={form.control}
                    name={`deductions.${index}.name`}
                    render={({ field }) => (
                    <FormItem className="flex-1">
                        <FormLabel>Deduction Name</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g., Staff Loan" /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name={`deductions.${index}.amount`}
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Amount (GHS)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
                </div>
            ))}
            </div>
            <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => append({ name: '', amount: 0 })}
            >
            Add Deduction
            </Button>
        </div>

        <div className="flex justify-end">
          <Button type="submit">
            {defaultValues ? 'Save Changes' : 'Add Staff Member'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
