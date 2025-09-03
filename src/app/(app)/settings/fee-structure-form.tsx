
'use client'

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { FeeStructure, SchoolClass, AcademicTerm } from '@/types';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  classId: z.string().min(1, 'Please select a class.'),
  academicTermId: z.string().min(1, 'Please select an academic term.'),
  latePenalty: z.coerce.number().optional(),
  admissionFee: z.coerce.number().optional(),
  termlyFee: z.coerce.number().optional(),
  schoolFees: z.coerce.number().optional(),
  booksFee: z.coerce.number().optional(),
  uniformFee: z.coerce.number().optional(),
  printingFee: z.coerce.number().optional(),
  arrears: z.coerce.number().optional(),
  others: z.coerce.number().optional(),
});

export type FormValues = z.infer<typeof formSchema>;

type FeeStructureFormProps = {
    onSubmit: SubmitHandler<FormValues>;
    defaultValues?: FeeStructure;
    classes: SchoolClass[];
    terms: AcademicTerm[];
}

export function FeeStructureForm({ onSubmit, defaultValues, classes, terms }: FeeStructureFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      classId: defaultValues?.classId || '',
      academicTermId: defaultValues?.academicTermId || '',
      latePenalty: defaultValues?.latePenalty || 50,
      admissionFee: defaultValues?.admissionFee || 0,
      termlyFee: defaultValues?.termlyFee || 0,
      schoolFees: defaultValues?.schoolFees || 0,
      booksFee: defaultValues?.booksFee || 0,
      uniformFee: defaultValues?.uniformFee || 0,
      printingFee: defaultValues?.printingFee || 0,
      arrears: defaultValues?.arrears || 0,
      others: defaultValues?.others || 0,
    }
  });

  React.useEffect(() => {
    form.reset(
        defaultValues ? {
            ...defaultValues,
            latePenalty: defaultValues.latePenalty || 50,
            admissionFee: defaultValues.admissionFee || 0,
            termlyFee: defaultValues.termlyFee || 0,
            schoolFees: defaultValues.schoolFees || 0,
            booksFee: defaultValues.booksFee || 0,
            uniformFee: defaultValues.uniformFee || 0,
            printingFee: defaultValues.printingFee || 0,
            arrears: defaultValues.arrears || 0,
            others: defaultValues.others || 0,
        } : {
            classId: '',
            academicTermId: '',
            latePenalty: 50,
            admissionFee: 0,
            termlyFee: 0,
            schoolFees: 0,
            booksFee: 0,
            uniformFee: 0,
            printingFee: 0,
            arrears: 0,
            others: 0,
        }
    );
  }, [defaultValues, form]);

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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FormField control={form.control} name="admissionFee" render={({ field }) => (<FormItem><FormLabel>Admission Fee</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="termlyFee" render={({ field }) => (<FormItem><FormLabel>Termly Fee</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="schoolFees" render={({ field }) => (<FormItem><FormLabel>School Fees</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="booksFee" render={({ field }) => (<FormItem><FormLabel>Books Fee</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="uniformFee" render={({ field }) => (<FormItem><FormLabel>Uniform Fee</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="printingFee" render={({ field }) => (<FormItem><FormLabel>Printing Fee</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="latePenalty" render={({ field }) => (<FormItem><FormLabel>Late Penalty</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="arrears" render={({ field }) => (<FormItem><FormLabel>Arrears</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="others" render={({ field }) => (<FormItem><FormLabel>Others</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
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
