
'use client'

import React from 'react';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { StaffMember } from '@/types';
import { PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

const itemSchema = z.object({
  name: z.string().min(1, "Item name is required."),
  amount: z.coerce.number().min(0, "Amount must be a positive number."),
});

const formSchema = z.object({
  grossSalary: z.coerce.number().min(0, 'Salary must be a positive number.'),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  momoNumber: z.string().optional(),
  deductions: z.array(itemSchema).optional(),
  arrears: z.array(itemSchema).optional(),
});

export type FormValues = z.infer<typeof formSchema>;

type PayrollFormProps = {
    onSubmit: SubmitHandler<FormValues>;
    defaultValues?: StaffMember;
}

export function PayrollForm({ onSubmit, defaultValues }: PayrollFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        grossSalary: defaultValues?.grossSalary || 0,
        bankName: defaultValues?.bankName || '',
        accountNumber: defaultValues?.accountNumber || '',
        momoNumber: defaultValues?.momoNumber || '',
        deductions: defaultValues?.deductions || [],
        arrears: defaultValues?.arrears || [],
    }
  });

   const { fields: deductionFields, append: appendDeduction, remove: removeDeduction } = useFieldArray({
    control: form.control,
    name: "deductions"
  });

  const { fields: arrearsFields, append: appendArrears, remove: removeArrears } = useFieldArray({
    control: form.control,
    name: "arrears"
  });


  React.useEffect(() => {
    form.reset({
        grossSalary: defaultValues?.grossSalary || 0,
        bankName: defaultValues?.bankName || '',
        accountNumber: defaultValues?.accountNumber || '',
        momoNumber: defaultValues?.momoNumber || '',
        deductions: defaultValues?.deductions || [],
        arrears: defaultValues?.arrears || [],
    })
  }, [defaultValues, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div>
            <h3 className="text-lg font-medium mb-2">Salary & Payment</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="grossSalary"
                    render={({ field }) => (
                        <FormItem className="md:col-span-2">
                        <FormLabel>Gross Annual Salary (GHS)</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 24000" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField control={form.control} name="bankName" render={({ field }) => (<FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input placeholder="e.g., GCB Bank" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="accountNumber" render={({ field }) => (<FormItem><FormLabel>Account Number</FormLabel><FormControl><Input placeholder="e.g., 1234567890123" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="momoNumber" render={({ field }) => (<FormItem><FormLabel>Contact / Mobile Money No.</FormLabel><FormControl><Input placeholder="e.g., 0241234567" {...field} /></FormControl><FormMessage /></FormItem>)} />
             </div>
        </div>
        
        <Separator />
        
        <div>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Arrears / Bonuses (One-Time Payment)</h3>
                 <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendArrears({ name: "", amount: 0 })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Item
                </Button>
            </div>
             <div className="space-y-4">
                {arrearsFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2">
                        <FormField
                            control={form.control}
                            name={`arrears.${index}.name`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                <FormLabel className={cn(index !== 0 && "sr-only")}>Item Name</FormLabel>
                                <FormControl><Input placeholder="e.g., Bonus" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`arrears.${index}.amount`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className={cn(index !== 0 && "sr-only")}>Amount (GHS)</FormLabel>
                                <FormControl><Input type="number" placeholder="100" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeArrears(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                ))}
             </div>
        </div>

        <Separator />

        <div>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">Custom Deductions (Recurring)</h3>
                 <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendDeduction({ name: "", amount: 0 })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Deduction
                </Button>
            </div>
             <div className="space-y-4">
                {deductionFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2">
                        <FormField
                            control={form.control}
                            name={`deductions.${index}.name`}
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                <FormLabel className={cn(index !== 0 && "sr-only")}>Deduction Name</FormLabel>
                                <FormControl><Input placeholder="e.g., Welfare" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`deductions.${index}.amount`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className={cn(index !== 0 && "sr-only")}>Amount (GHS)</FormLabel>
                                <FormControl><Input type="number" placeholder="50" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeDeduction(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                ))}
             </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit">
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  )
}
