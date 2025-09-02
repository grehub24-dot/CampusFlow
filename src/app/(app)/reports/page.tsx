
'use client'

import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { generateInsightfulReports } from '@/ai/flows/generate-insightful-reports';
import type { GenerateInsightfulReportsInput, GenerateInsightfulReportsOutput } from '@/ai/flows/generate-insightful-reports';
import { ReportDisplay } from './report-display';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  reportType: z.string().min(1, 'Please select a report type.'),
  additionalInstructions: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ReportsPage() {
  const [report, setReport] = useState<GenerateInsightfulReportsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reportType: '',
      additionalInstructions: '',
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsLoading(true);
    setReport(null);
    try {
      const result = await generateInsightfulReports(values as GenerateInsightfulReportsInput);
      setReport(result);
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast({
        variant: 'destructive',
        title: 'Error Generating Report',
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Report Generation"
        description="Use AI to generate insightful reports from your school's data."
      />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 h-fit">
          <CardHeader>
            <CardTitle>Create a New Report</CardTitle>
            <CardDescription>Select the type of report you want to generate and add any specific instructions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="reportType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Report Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a report type..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admissions">Admissions</SelectItem>
                          <SelectItem value="student demographics">Student Demographics</SelectItem>
                          <SelectItem value="financial data">Financial Data</SelectItem>
                          <SelectItem value="academic progress">Academic Progress</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="additionalInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Instructions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., 'Focus on the last quarter admissions for Grade 10 and 11'"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Generate Report'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <div className="lg:col-span-3">
          <ReportDisplay report={report} isLoading={isLoading} />
        </div>
      </div>
    </>
  );
}
