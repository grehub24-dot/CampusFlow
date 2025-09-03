
'use client'

import React from 'react';
import { useForm, type SubmitHandler, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Student, FeeStructure, AcademicTerm } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  studentId: z.string().min(1, 'Please select a student.'),
  amount: z.coerce.number().min(0, 'Amount cannot be negative.'),
  paymentDate: z.date({ required_error: 'Payment date is required.' }),
  paymentMethod: z.enum(['Cash', 'Bank Transfer', 'Mobile Money', 'Card']),
  notes: z.string().optional(),
  items: z.array(z.object({
    name: z.string(),
    amount: z.coerce.number(),
    included: z.boolean().default(true),
  })),
});

export type FormValues = z.infer<typeof formSchema>;

type PaymentFormProps = {
  students: Student[];
  feeStructures: FeeStructure[];
  currentTerm: AcademicTerm | null;
  onSubmit: SubmitHandler<FormValues>;
}

export function PaymentForm({ students, feeStructures, currentTerm, onSubmit }: PaymentFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: '',
      amount: 0,
      paymentDate: new Date(),
      paymentMethod: undefined,
      notes: '',
      items: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const selectedStudentId = useWatch({ control: form.control, name: 'studentId' });
  const paymentItems = useWatch({ control: form.control, name: 'items' });

  React.useEffect(() => {
    if (selectedStudentId && currentTerm) {
        const student = students.find(s => s.id === selectedStudentId);
        if (student && student.classId) {
            const feeStructure = feeStructures.find(fs => 
                fs.classId === student.classId && fs.academicTermId === currentTerm.id
            );
            
            const newItems = [];
            if (feeStructure) {
                // We exclude admission fee as per the requirement
                if (feeStructure.schoolFees) newItems.push({ name: 'School Fees', amount: feeStructure.schoolFees, included: true });
                if (feeStructure.booksFee) newItems.push({ name: 'Books Fee', amount: feeStructure.booksFee, included: true });
                if (feeStructure.uniformFee) newItems.push({ name: 'Uniform Fee', amount: feeStructure.uniformFee, included: true });
                if (feeStructure.printingFee) newItems.push({ name: 'Printing Fee', amount: feeStructure.printingFee, included: true });
                if (feeStructure.others) newItems.push({ name: 'Others', amount: feeStructure.others, included: true });
            }
            replace(newItems);
        } else {
            replace([]); // Clear items if no student or classId found
        }
    } else {
        replace([]); // Clear items if no student or term selected
    }
  }, [selectedStudentId, students, feeStructures, currentTerm, replace]);

  React.useEffect(() => {
    const total = paymentItems.reduce((sum, item) => item.included ? sum + item.amount : sum, 0);
    form.setValue('amount', total);
  }, [paymentItems, form]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="studentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Student</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>{student.name} - {student.class}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {fields.length > 0 && (
            <div className="space-y-2">
                <Label>Fee Items</Label>
                <div className="space-y-2 rounded-md border p-4">
                    {fields.map((item, index) => (
                         <div key={item.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <FormField
                                    control={form.control}
                                    name={`items.${index}.included`}
                                    render={({ field }) => (
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            id={`items.${index}.included`}
                                        />
                                    )}
                                />
                               <Label htmlFor={`items.${index}.included`} className="font-normal">{item.name}</Label>
                            </div>
                            <span className="text-sm">GHS {item.amount.toLocaleString()}</span>
                        </div>
                    ))}
                     <div className="flex items-center justify-between pt-2 border-t">
                        <Label className="font-semibold">Total</Label>
                        <span className="font-semibold">GHS {form.getValues('amount').toLocaleString()}</span>
                    </div>
                </div>
            </div>
        )}

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Payment Amount (GHS)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 500.00" {...field} readOnly className="bg-muted" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="paymentDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Payment Date</FormLabel>
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
                        {field.value ? (
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
           <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a payment method..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
       
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., 'Part payment for 1st term fees'"
                  className="resize-y"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit">
            Record Payment
          </Button>
        </div>
      </form>
    </Form>
  )
}
