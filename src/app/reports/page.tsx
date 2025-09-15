
'use client'

import React, { useState, useEffect } from 'react';
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
import type { GenerateInsightfulReportsOutput, Student, Payment, Transaction, AcademicTerm } from '@/types';
import { ReportDisplay } from './report-display';
import { useToast } from '@/hooks/use-toast';
import { reportTemplates } from "./report-templates";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IncomeAndExpenditureReport } from './income-and-expenditure-report';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const formSchema = z.object({
  reportType: z.string().min(1, 'Please select a report type.'),
  additionalInstructions: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ReportsPage() {
  const [report, setReport] = useState<GenerateInsightfulReportsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isIncomeStatementOpen, setIsIncomeStatementOpen] = useState(false);
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentTerm, setCurrentTerm] = useState<AcademicTerm | null>(null);


  useEffect(() => {
    const studentsQuery = query(collection(db, "students"));
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    });

    const paymentsQuery = query(collection(db, "payments"));
    const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
    });

    const transactionsQuery = query(collection(db, "transactions"));
    const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });

    const termsQuery = query(collection(db, "academic-terms"));
    const unsubscribeTerms = onSnapshot(termsQuery, (snapshot) => {
        const current = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AcademicTerm)).find(t => t.isCurrent);
        setCurrentTerm(current || null);
    });

    return () => {
        unsubscribeStudents();
        unsubscribePayments();
        unsubscribeTransactions();
        unsubscribeTerms();
    }
  }, []);

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
    
    if (values.reportType === 'Income and Expenditure') {
      setIsIncomeStatementOpen(true);
      setIsLoading(false);
      return;
    }

    try {
      const staticReport: GenerateInsightfulReportsOutput = {
        reportFormat: "text",
        reportContent: reportTemplates[values.reportType] || "Template not found.",
      };

      setTimeout(() => {
        setReport(staticReport);
        setIsLoading(false);
      }, 500); // simulate delay
    } catch (error) {
      console.error('Failed to load report:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong while preparing the report.',
      });
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Report Generation"
        description="Generate structured reports from predefined templates."
      />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 h-fit">
          <CardHeader>
            <CardTitle>Create a New Report</CardTitle>
            <CardDescription>Select the type of report and add instructions.</CardDescription>
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
                          <SelectItem value="Admissions">Admissions</SelectItem>
                          <SelectItem value="Student Demographics">Student Demographics</SelectItem>
                          <SelectItem value="Financial Data">Financial Data</SelectItem>
                          <SelectItem value="Academic Progress">Academic Progress</SelectItem>
                          <SelectItem value="Executive Brief">Executive Brief</SelectItem>
                          <SelectItem value="Income and Expenditure">Income and Expenditure</SelectItem>
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
                      <FormLabel>Additional Instructions (for reference)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Focus on last quarter admissions for Grade 10 and 11"
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
      
      <Dialog open={isIncomeStatementOpen} onOpenChange={setIsIncomeStatementOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Income and Expenditure Account</DialogTitle>
                <DialogDescription>
                    A detailed breakdown of income and expenses for the specified period.
                </DialogDescription>
            </DialogHeader>
            <div className="max-h-[80vh] overflow-y-auto">
                <IncomeAndExpenditureReport 
                  payments={payments}
                  transactions={transactions}
                  students={students}
                  currentTerm={currentTerm}
                />
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
