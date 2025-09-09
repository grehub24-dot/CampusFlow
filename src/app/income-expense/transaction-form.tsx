
'use client'

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Transaction, TransactionCategory } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

const formSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than zero.'),
  date: z.date({ required_error: 'Transaction date is required.' }),
  categoryId: z.string().min(1, 'Please select a category.'),
  description: z.string().min(3, 'Description is required.'),
});

export type FormValues = z.infer<typeof formSchema>;

type TransactionFormProps = {
    onSubmit: SubmitHandler<FormValues>;
    defaultValues?: Transaction;
    categories: TransactionCategory[];
}

export function TransactionForm({ onSubmit, defaultValues, categories }: TransactionFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        type: defaultValues?.type || 'expense',
        amount: defaultValues?.amount || 0,
        date: defaultValues?.date ? new Date(defaultValues.date) : new Date(),
        categoryId: defaultValues?.categoryId || '',
        description: defaultValues?.description || '',
    }
  });

  const transactionType = form.watch('type');
  
  const filteredCategories = React.useMemo(() => {
    return categories.filter(c => c.type === transactionType);
  }, [categories, transactionType]);

  // Reset category if type changes and selected category is no longer valid
  React.useEffect(() => {
    const selectedCategory = categories.find(c => c.id === form.getValues('categoryId'));
    if (selectedCategory && selectedCategory.type !== transactionType) {
        form.setValue('categoryId', '');
    }
  }, [transactionType, categories, form]);

  React.useEffect(() => {
    form.reset({
        type: defaultValues?.type || 'expense',
        amount: defaultValues?.amount || 0,
        date: defaultValues?.date ? new Date(defaultValues.date) : new Date(),
        categoryId: defaultValues?.categoryId || '',
        description: defaultValues?.description || '',
    })
  }, [defaultValues, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Amount (GHS)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : (<span>Pick a date</span>)}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a category..." /></SelectTrigger></FormControl>
                        <SelectContent>
                            {filteredCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="e.g., Purchase of new textbooks" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <div className="flex justify-end">
          <Button type="submit">
            {defaultValues ? 'Save Changes' : 'Add Transaction'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
