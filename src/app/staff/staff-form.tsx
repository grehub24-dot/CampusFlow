
'use client'

import React from 'react';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { StaffMember } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';


import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';

const deductionSchema = z.object({
  name: z.string().min(1, "Deduction name is required."),
  amount: z.coerce.number().min(0, "Amount must be a positive number."),
});

const formSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  role: z.string().min(1, 'Role is required.'),
  employmentDate: z.date().optional(),
  qualification: z.string().optional(),
  subjectsTaught: z.string().optional(),
  notes: z.string().optional(),
  grossSalary: z.coerce.number().min(0, 'Salary must be a positive number.'),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  momoNumber: z.string().optional(),
  status: z.enum(['Active', 'Inactive']),
  contractStatus: z.enum(['Probation', 'Full-Time', 'Part-Time', 'Attachment', 'Service']).optional(),
  deductions: z.array(deductionSchema).optional(),
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
        bankName: defaultValues?.bankName || '',
        accountNumber: defaultValues?.accountNumber || '',
        momoNumber: defaultValues?.momoNumber || '',
        status: defaultValues?.status || 'Active',
        contractStatus: defaultValues?.contractStatus,
        employmentDate: defaultValues?.employmentDate ? new Date(defaultValues.employmentDate) : undefined,
        qualification: defaultValues?.qualification || '',
        subjectsTaught: defaultValues?.subjectsTaught || '',
        notes: defaultValues?.notes || '',
        deductions: defaultValues?.deductions || [],
    }
  });

   const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "deductions"
  });


  React.useEffect(() => {
    form.reset({
        name: defaultValues?.name || '',
        role: defaultValues?.role || '',
        grossSalary: defaultValues?.grossSalary || 0,
        bankName: defaultValues?.bankName || '',
        accountNumber: defaultValues?.accountNumber || '',
        momoNumber: defaultValues?.momoNumber || '',
        status: defaultValues?.status || 'Active',
        contractStatus: defaultValues?.contractStatus,
        employmentDate: defaultValues?.employmentDate ? new Date(defaultValues.employmentDate) : undefined,
        qualification: defaultValues?.qualification || '',
        subjectsTaught: defaultValues?.subjectsTaught || '',
        notes: defaultValues?.notes || '',
        deductions: defaultValues?.deductions || [],
    })
  }, [defaultValues, form]);
  
  const internalOnSubmit: SubmitHandler<FormValues> = (values) => {
    const dataToSubmit = {
      ...values,
      employmentDate: values.employmentDate ? values.employmentDate : undefined,
    };
    onSubmit(dataToSubmit);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(internalOnSubmit)} className="space-y-6">
        <div>
            <h3 className="text-lg font-medium mb-2">Personal & Role Information</h3>
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
                <FormField
                    control={form.control}
                    name="contractStatus"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Contract Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select contract status..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Probation">Probation</SelectItem>
                                    <SelectItem value="Full-Time">Full-Time</SelectItem>
                                    <SelectItem value="Part-Time">Part-Time</SelectItem>
                                    <SelectItem value="Attachment">Attachment</SelectItem>
                                    <SelectItem value="Service">Service</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>

        <Separator />
        
        <div>
            <h3 className="text-lg font-medium mb-2">Employment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="employmentDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Employment Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value && field.value instanceof Date && !isNaN(field.value.getTime()) ? (
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField control={form.control} name="qualification" render={({ field }) => (<FormItem><FormLabel>Qualification</FormLabel><FormControl><Input placeholder="e.g., B.Ed. Basic Education" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="subjectsTaught" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Subjects / Classes Taught</FormLabel><FormControl><Input placeholder="e.g., Primary 4 English, Maths" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="notes" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Any additional information..." {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
        </div>

        <Separator />
        
         <div>
            <h3 className="text-lg font-medium mb-2">Salary & Payment</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <FormField control={form.control} name="bankName" render={({ field }) => (<FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="accountNumber" render={({ field }) => (<FormItem><FormLabel>Account Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="momoNumber" render={({ field }) => (<FormItem><FormLabel>Contact / Mobile Money No.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
        </div>
        
        <Separator />

        <div>
            <h3 className="text-lg font-medium mb-2">Custom Deductions</h3>
            <div className="space-y-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2">
                        <FormField
                            control={form.control}
                            name={`deductions.${index}.name`}
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormLabel>Deduction Name</FormLabel>
                                    <FormControl><Input placeholder="e.g. Welfare" {...field} /></FormControl>
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
                 <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ name: '', amount: 0 })}
                    className="mt-2"
                    >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Deduction
                </Button>
            </div>
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


