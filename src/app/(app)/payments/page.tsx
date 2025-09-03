
'use client'

import React from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, query, where } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Student, Payment, Invoice, AcademicTerm, FeeStructure } from '@/types';
import { useToast } from '@/hooks/use-toast';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, Wallet, Clock, Receipt, Calendar, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from '@/components/dashboard/stat-card';
import PaymentForm from './payment-form';
import { RecentPaymentsTable } from '../dashboard/recent-payments-table';
import { PendingInvoicesTable } from '../dashboard/pending-invoices-table';
import { paymentColumns } from '../dashboard/payment-columns';
import { invoiceColumns } from '../dashboard/invoice-columns';


export default function PaymentsPage() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [currentTerm, setCurrentTerm] = React.useState<AcademicTerm | null>(null);
  const [feeStructures, setFeeStructures] = React.useState<FeeStructure[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { toast } = useToast();

  React.useEffect(() => {
    const academicTermsQuery = query(collection(db, "academic-terms"), where("isCurrent", "==", true));
    const unsubscribeSettings = onSnapshot(academicTermsQuery, (snapshot) => {
        if (!snapshot.empty) {
            const termDoc = snapshot.docs[0];
            setCurrentTerm({ id: termDoc.id, ...termDoc.data() } as AcademicTerm);
        } else {
            setCurrentTerm(null);
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
    
    const feeStructuresQuery = collection(db, "fee-structures");
    const unsubscribeFeeStructures = onSnapshot(feeStructuresQuery, (snapshot) => {
      const feeStructuresData: FeeStructure[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeStructure));
      setFeeStructures(feeStructuresData);
    });

    return () => {
      unsubscribeSettings();
      unsubscribeStudents();
      unsubscribePayments();
      unsubscribeInvoices();
      unsubscribeFeeStructures();
    };
  }, []);

  const totalRevenue = payments.reduce((acc, p) => acc + (p.status === 'Paid' ? p.amount : 0), 0);
  const pendingInvoicesTotal = invoices.reduce((acc, i) => acc + i.amount, 0);
  const revenueThisTerm = currentTerm ? payments.filter(p => p.term === currentTerm.session && p.academicYear === currentTerm.academicYear).reduce((acc, p) => acc + (p.status === 'Paid' ? p.amount : 0), 0) : 0;

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
                {currentTerm && (
                  <PaymentForm 
                    students={students} 
                    feeStructures={feeStructures}
                    currentTerm={currentTerm}
                    onSuccess={() => setIsFormDialogOpen(false)}
                  />
                )}
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
        <StatCard 
            title="Academic Year"
            value={currentTerm?.academicYear || 'Not Set'}
            icon={Calendar}
        />
        <StatCard 
            title="Current Session"
            value={currentTerm?.session || 'Not Set'}
            icon={BookOpen}
        />
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
            description={`For ${currentTerm?.session || ''} ${currentTerm?.academicYear || ''}`}
        />
        <StatCard 
            title="Total Pending Invoices"
            value={`${invoices.length}`}
            icon={Clock}
            description={`GHS ${pendingInvoicesTotal.toLocaleString()}`}
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
