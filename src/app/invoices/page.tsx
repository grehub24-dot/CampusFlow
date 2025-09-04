
'use client'

import React from 'react';
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Payment, Invoice, AcademicTerm } from '@/types';
import { useToast } from '@/hooks/use-toast';

import { PageHeader } from "@/components/page-header";
import { Receipt, Calendar, BookOpen, Clock } from "lucide-react";
import StatCard from '@/components/dashboard/stat-card';
import { PendingInvoicesTable } from '../dashboard/pending-invoices-table';
import { invoiceColumns } from './columns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PaymentDetails } from '@/components/payment-details';


export default function InvoicesPage() {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [currentTerm, setCurrentTerm] = React.useState<AcademicTerm | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedPayment, setSelectedPayment] = React.useState<Payment | null>(null);
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = React.useState(false);


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
      unsubscribePayments();
      unsubscribeInvoices();
    };
  }, []);
  
  const pendingInvoicesTotal = invoices.reduce((acc, i) => acc + i.amount, 0);
  const revenueThisTerm = currentTerm ? payments.filter(p => p.term === currentTerm.session && p.academicYear === currentTerm.academicYear).reduce((acc, p) => acc + (p.status === 'Paid' ? p.amount : 0), 0) : 0;

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Manage all pending financial transactions."
      />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
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

      <div>
        <PendingInvoicesTable columns={invoiceColumns} data={invoices} />
      </div>
      
      <Sheet open={isPaymentSheetOpen} onOpenChange={setIsPaymentSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Payment Details</SheetTitle>
          </SheetHeader>
          {selectedPayment && <PaymentDetails payment={selectedPayment} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
