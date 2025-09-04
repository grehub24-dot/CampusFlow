
'use client'

import React from 'react';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { FeeStructure, SchoolClass, AcademicTerm, FeeItem } from '@/types';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';


const feeStructureItemSchema = z.object({
  feeItemId: z.string(),
  amount: z.coerce.number().min(0, "Amount must be positive"),
});

const formSchema = z.object({
  classId: z.string().min(1, 'Please select a class.'),
  academicTermId: z.string().min(1, 'Please select an academic term.'),
  items: z.array(feeStructureItemSchema),
});

export type FormValues = z.infer<typeof formSchema>;

type FeeStructureFormProps = {
    onSubmit: SubmitHandler<FormValues>;
    defaultValues?: FeeStructure;
    classes: SchoolClass[];
    terms: AcademicTerm[];
    feeItems: FeeItem[];
}

export function FeeStructureForm({ onSubmit, defaultValues, classes, terms, feeItems }: FeeStructureFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      classId: '',
      academicTermId: '',
      items: [],
    }
  });
  
  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "items"
  });

  React.useEffect(() => {
    const initialItems = feeItems.map(item => {
        const existingItem = defaultValues?.items.find(i => i.feeItemId === item.id);
        return {
            feeItemId: item.id,
            amount: existingItem?.amount || 0,
        };
    });

    form.reset({
      classId: defaultValues?.classId || '',
      academicTermId: defaultValues?.academicTermId || '',
      items: initialItems,
    });
  }, [defaultValues, feeItems, form]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="classId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Class</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!defaultValues}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a class..." /></SelectTrigger></FormControl>
                        <SelectContent>
                            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="academicTermId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Academic Term</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!defaultValues}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a term..." /></SelectTrigger></FormControl>
                        <SelectContent>
                            {terms.map(t => <SelectItem key={t.id} value={t.id}>{`${t.session} (${t.academicYear})`}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        <div className="space-y-4">
            <h3 className="text-lg font-medium">Fee Item Amounts</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {fields.map((field, index) => {
                    const feeItem = feeItems.find(fi => fi.id === field.feeItemId);
                    if (!feeItem) return null;
                    return (
                        <FormField
                            key={field.id}
                            control={form.control}
                            name={`items.${index}.amount`}
                            render={({ field: formField }) => (
                                <FormItem>
                                    <FormLabel>{feeItem.name}</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="0.00" {...formField} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    );
                })}
            </div>
        </div>


        <div className="flex justify-end">
          <Button type="submit">
            {defaultValues ? 'Save Changes' : 'Add Fee Structure'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
