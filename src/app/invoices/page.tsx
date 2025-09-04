
'use client'

import React from 'react';
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Payment, Invoice, AcademicTerm, Student, FeeStructure, FeeItem } from '@/types';
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
  const [students, setStudents] = React.useState<Student[]>([]);
  const [feeStructures, setFeeStructures] = React.useState<FeeStructure[]>([]);
  const [feeItems, setFeeItems] = React.useState<FeeItem[]>([]);
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

    const studentsQuery = collection(db, "students");
    const unsubscribeStudents = onSnapshot(studentsQuery, (querySnapshot) => {
      setStudents(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    });

    const feeStructuresQuery = query(collection(db, "fee-structures"));
    const unsubscribeFeeStructures = onSnapshot(feeStructuresQuery, (snapshot) => {
        setFeeStructures(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeStructure)));
    });
    
    const feeItemsQuery = query(collection(db, "fee-items"));
    const unsubscribeFeeItems = onSnapshot(feeItemsQuery, (snapshot) => {
        setFeeItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeItem)));
        setIsLoading(false);
    });
    
    return () => {
      unsubscribeSettings();
      unsubscribePayments();
      unsubscribeStudents();
      unsubscribeFeeStructures();
      unsubscribeFeeItems();
    };
  }, []);
  
  const pendingInvoices: Invoice[] = React.useMemo(() => {
    if (!currentTerm || students.length === 0 || feeStructures.length === 0 || feeItems.length === 0) {
      return [];
    }

    return students.map(student => {
      const structure = feeStructures.find(fs => fs.classId === student.classId && fs.academicTermId === currentTerm.id);
      if (!structure || !Array.isArray(structure.items)) return null;
      
      const isNew = student.admissionTerm === currentTerm.session && student.admissionYear === currentTerm.academicYear;
      const termNumber = parseInt(currentTerm.session.split(' ')[0], 10);

      const totalAmountDue = structure.items.reduce((total, item) => {
          const feeItemInfo = feeItems.find(fi => fi.id === item.feeItemId);
          if (!feeItemInfo || feeItemInfo.isOptional) return total;
          
          if (isNew) {
            if (feeItemInfo.appliesTo.includes('new')) return total + item.amount;
          } else {
            if (termNumber === 1 && feeItemInfo.appliesTo.includes('term1')) return total + item.amount;
            if (termNumber > 1 && feeItemInfo.appliesTo.includes('term2_3')) return total + item.amount;
          }
          return total;
      }, 0);

      const totalPaid = payments
        .filter(p => p.studentId === student.id && p.academicYear === currentTerm.academicYear && p.term === currentTerm.session)
        .reduce((sum, p) => sum + p.amount, 0);

      const balance = totalAmountDue - totalPaid;
      
      if (balance > 0) {
        return {
          id: student.id,
          studentId: student.id,
          studentName: student.name,
          amount: balance,
          dueDate: currentTerm.endDate,
        };
      }
      
      return null;
    }).filter((invoice): invoice is Invoice => invoice !== null);
  }, [students, payments, feeStructures, feeItems, currentTerm]);

  const pendingInvoicesTotal = pendingInvoices.reduce((acc, i) => acc + i.amount, 0);
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
            value={`${pendingInvoices.length}`}
            icon={Clock}
            description={`GHS ${pendingInvoicesTotal.toLocaleString()}`}
        />
      </div>

      <div>
        <PendingInvoicesTable columns={invoiceColumns} data={pendingInvoices} />
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
