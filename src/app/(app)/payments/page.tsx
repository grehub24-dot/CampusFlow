
'use client'

import React from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Student, Payment, Invoice } from '@/types';
import { useToast } from '@/hooks/use-toast';
import type { SubmitHandler } from 'react-hook-form';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, Wallet, Clock, Receipt } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import StatCard from '@/components/dashboard/stat-card';
import { PaymentForm, type FormValues } from './payment-form';
import { RecentPaymentsTable } from '../dashboard/recent-payments-table';
import { PendingInvoicesTable } from '../dashboard/pending-invoices-table';
import { paymentColumns } from '../dashboard/payment-columns';
import { invoiceColumns } from '../dashboard/invoice-columns';


export default function PaymentsPage() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [schoolSettings, setSchoolSettings] = React.useState({ academicYear: 'Loading...', currentSession: 'Loading...' });

  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { toast } = useToast();

  React.useEffect(() => {
    const settingsDocRef = doc(db, 'school-settings', 'current');
    const unsubscribeSettings = onSnapshot(settingsDocRef, (doc) => {
        if (doc.exists()) {
            setSchoolSettings(doc.data() as { academicYear: string, currentSession: string });
        }
    });

    const studentsQuery = collection(db, "students");
    const unsubscribeStudents = onSnapshot(studentsQuery, (querySnapshot) => {
      const studentsData: Student[] = [];
      querySnapshot.forEach((doc) => {
        studentsData.push({ id: doc.id, ...doc.data() } as Student);
      });
      setStudents(studentsData);
    });

    const paymentsQuery = collection(db, "payments");
    const unsubscribePayments = onSnapshot(paymentsQuery, (querySnapshot) => {
      const paymentsData: Payment[] = [];
      querySnapshot.forEach((doc) => {
        paymentsData.push({ id: doc.id, ...doc.data() } as Payment);
      });
      setPayments(paymentsData);
    });

    const invoicesQuery = collection(db, "invoices");
    const unsubscribeInvoices = onSnapshot(invoicesQuery, (querySnapshot) => {
      const invoicesData: Invoice[] = [];
      querySnapshot.forEach((doc) => {
        invoicesData.push({ id: doc.id, ...doc.data() } as Invoice);
      });
      setInvoices(invoicesData);
      setIsLoading(false);
    });

    return () => {
      unsubscribeSettings();
      unsubscribeStudents();
      unsubscribePayments();
      unsubscribeInvoices();
    };
  }, []);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      const selectedStudent = students.find(s => s.id === values.studentId);
      if (!selectedStudent) {
        throw new Error("Student not found");
      }

      const newPaymentData = {
        studentId: values.studentId,
        studentName: selectedStudent.name,
        amount: values.amount,
        date: values.paymentDate.toISOString(),
        status: 'Paid', // Assuming direct payments are always successful
        paymentMethod: values.paymentMethod,
        notes: values.notes,
        academicYear: schoolSettings.academicYear,
        term: schoolSettings.currentSession,
      };

      await addDoc(collection(db, "payments"), newPaymentData);

      // Optionally, update the student's payment status
      const studentDocRef = doc(db, "students", values.studentId);
      await updateDoc(studentDocRef, { paymentStatus: 'Paid' });

      toast({
        title: 'Payment Recorded',
        description: `Payment of GHS ${values.amount} for ${selectedStudent.name} has been recorded.`,
      });
      setIsFormDialogOpen(false);
    } catch (error) {
      console.error("Error recording payment: ", error);
      toast({
        variant: "destructive",
        title: "Save Error",
        description: "Could not record the payment. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalRevenue = payments.reduce((acc, p) => acc + (p.status === 'Paid' ? p.amount : 0), 0);
  const pendingInvoicesTotal = invoices.reduce((acc, i) => acc + i.amount, 0);
  const revenueThisTerm = payments.filter(p => p.term === schoolSettings.currentSession && p.academicYear === schoolSettings.academicYear).reduce((acc, p) => acc + (p.status === 'Paid' ? p.amount : 0), 0);

  return (
    <>
      <PageHeader
        title="Payments"
        description="Manage all financial transactions and invoices."
      >
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Record New Payment</DialogTitle>
              <DialogDescription>Fill out the form below to record a new financial transaction.</DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto p-1">
                <PaymentForm students={students} onSubmit={onSubmit} />
            </div>
             {isSubmitting && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}
          </DialogContent>
        </Dialog>
      </PageHeader>
      
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3 mb-6">
        <StatCard 
            title="Total Revenue"
            value={`GHS ${totalRevenue.toLocaleString()}`}
            icon={Wallet}
            description="All-time payments received"
        />
        <StatCard 
            title="Revenue (This Term)"
            value={`GHS ${revenueThisTerm.toLocaleString()}`}
            icon={Receipt}
            description={`For ${schoolSettings.currentSession}`}
        />
        <StatCard 
            title="Total Pending Invoices"
            value={`GHS ${pendingInvoicesTotal.toLocaleString()}`}
            icon={Clock}
            description={`${invoices.length} invoices`}
        />
      </div>

      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payments">All Payments</TabsTrigger>
          <TabsTrigger value="invoices">Pending Invoices</TabsTrigger>
        </TabsList>
        <TabsContent value="payments">
          <RecentPaymentsTable columns={paymentColumns} data={payments} />
        </TabsContent>
        <TabsContent value="invoices">
          <PendingInvoicesTable columns={invoiceColumns} data={invoices} />
        </TabsContent>
      </Tabs>
    </>
  );
}
