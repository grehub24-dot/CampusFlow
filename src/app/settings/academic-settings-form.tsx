
'use client'

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { AcademicTerm } from '@/types';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';


const formSchema = z.object({
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, 'Please use the format YYYY-YYYY.'),
  session: z.string().min(1, 'Session is required.'),
  startDate: z.date({ required_error: 'Start date is required.' }),
  endDate: z.date({ required_error: 'End date is required.' }),
}).refine(data => data.endDate > data.startDate, {
  message: "End date must be after start date.",
  path: ["endDate"],
});


export type FormValues = z.infer<typeof formSchema>;

type AcademicTermFormProps = {
    onSubmit: SubmitHandler<FormValues>;
    defaultValues?: AcademicTerm;
}

export function AcademicTermForm({ onSubmit, defaultValues }: AcademicTermFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        academicYear: defaultValues?.academicYear || '',
        session: defaultValues?.session || '',
        startDate: defaultValues?.startDate ? new Date(defaultValues.startDate) : undefined,
        endDate: defaultValues?.endDate ? new Date(defaultValues.endDate) : undefined,
    }
  });

  React.useEffect(() => {
    form.reset({
        academicYear: defaultValues?.academicYear || '',
        session: defaultValues?.session || '',
        startDate: defaultValues?.startDate ? new Date(defaultValues.startDate) : undefined,
        endDate: defaultValues?.endDate ? new Date(defaultValues.endDate) : undefined,
    })
  }, [defaultValues, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="academicYear"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Academic Year</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., 2024-2025" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="session"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Session / Term</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select session..." />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="1st Term">1st Term</SelectItem>
                                <SelectItem value="2nd Term">2nd Term</SelectItem>
                                <SelectItem value="3rd Term">3rd Term</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
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
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date</FormLabel>
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
        </div>
        <div className="flex justify-end">
          <Button type="submit">
            {defaultValues ? 'Save Changes' : 'Add Term'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
