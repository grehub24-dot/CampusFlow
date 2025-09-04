
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PaymentDetails } from '@/components/payment-details';
import { StudentDetails } from '@/components/student-details';
import { useRouter } from 'next/navigation';


export default function PaymentsPage() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [currentTerm, setCurrentTerm] = React.useState<AcademicTerm | null>(null);
  const [feeStructures, setFeeStructures] = React.useState<FeeStructure[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
  const [selectedPayment, setSelectedPayment] = React.useState<Payment | null>(null);
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = React.useState(false);
  const [isStudentSheetOpen, setIsStudentSheetOpen] = React.useState(false);
  const router = useRouter();


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
  
  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsPaymentSheetOpen(true);
  }

  const handleViewStudent = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
        setSelectedStudent(student);
        setIsStudentSheetOpen(true);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find student details.'})
    }
  }
  
  const memoizedPaymentColumns = React.useMemo(
      () => paymentColumns({ onViewPayment: handleViewPayment, onViewStudent: handleViewStudent }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [students]
  );


  const totalRevenue = payments.reduce((acc, p) => acc + (p.status === 'Paid' ? p.amount : 0), 0);
  const pendingInvoicesTotal = invoices.reduce((acc, i) => acc + i.amount, 0);
  const revenueThisTerm = currentTerm ? payments.filter(p => p.term === currentTerm.session && p.academicYear === currentTerm.academicYear).reduce((acc, p) => acc + (p.status === 'Paid' ? p.amount : 0), 0) : 0;

  return (
    <>
      <PageHeader
        title="Payments"
        description="Manage all financial transactions and invoices."
      >
        <Button onClick={() => router.push('/invoices')}>
          <Receipt className="mr-2 h-4 w-4" />
          View Invoices
        </Button>
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
                    payments={payments}
                    currentTerm={currentTerm}
                    onSuccess={() => setIsFormDialogOpen(false)}
                  />
                )}
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>
      
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
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
         <StatCard 
            title="Total Pending Invoices"
            value={`${invoices.length}`}
            icon={Clock}
            description={`GHS ${pendingInvoicesTotal.toLocaleString()}`}
        />
      </div>
      
      <RecentPaymentsTable columns={memoizedPaymentColumns} data={payments} />

      <Sheet open={isPaymentSheetOpen} onOpenChange={setIsPaymentSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Payment Details</SheetTitle>
          </SheetHeader>
          {selectedPayment && <PaymentDetails payment={selectedPayment} />}
        </SheetContent>
      </Sheet>

      <Sheet open={isStudentSheetOpen} onOpenChange={setIsStudentSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Student Details</SheetTitle>
          </SheetHeader>
          {selectedStudent && <StudentDetails student={selectedStudent} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
