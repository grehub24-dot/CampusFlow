'use client'

import React from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, query, where, orderBy } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Student, Payment, Invoice, AcademicTerm, FeeStructure, FeeItem } from '@/types';
import { useToast } from '@/hooks/use-toast';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, Wallet, Clock, Receipt, Calendar, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from '@/components/dashboard/stat-card';
import PaymentForm from './payment-form';
import { PaymentsTable } from './payments-table';
import { PendingInvoicesTable } from '../dashboard/pending-invoices-table';
import { paymentColumns } from '../dashboard/payment-columns';
import { invoiceColumns } from '../dashboard/invoice-columns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PaymentDetails } from '@/components/payment-details';
import { StudentDetails } from '@/components/student-details';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';


export default function PaymentsPage() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [currentTerm, setCurrentTerm] = React.useState<AcademicTerm | null>(null);
  const [feeStructures, setFeeStructures] = React.useState<FeeStructure[]>([]);
  const [feeItems, setFeeItems] = React.useState<FeeItem[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
  const [selectedPayment, setSelectedPayment] = React.useState<Payment | null>(null);
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = React.useState(false);
  const [isStudentSheetOpen, setIsStudentSheetOpen] = React.useState(false);
  const router = useRouter();


  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const canReadFinancials = hasPermission('financials:read');

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

    const paymentsQuery = query(collection(db, "payments"), orderBy("date", "desc"));
    const unsubscribePayments = onSnapshot(paymentsQuery, (querySnapshot) => {
      const paymentsData: Payment[] = [];
      querySnapshot.forEach((doc) => {
        paymentsData.push({ id: doc.id, ...doc.data() } as Payment);
      });
      setPayments(paymentsData);
    });
    
    const feeStructuresQuery = query(collection(db, "fee-structures"));
    const unsubscribeFeeStructures = onSnapshot(feeStructuresQuery, (snapshot) => {
      const feeStructuresData: FeeStructure[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeStructure));
      setFeeStructures(feeStructuresData);
    });
    
    const feeItemsQuery = query(collection(db, "fee-items"));
    const unsubscribeFeeItems = onSnapshot(feeItemsQuery, (snapshot) => {
        setFeeItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeItem)));
        setIsLoading(false);
    });

    return () => {
      unsubscribeSettings();
      unsubscribeStudents();
      unsubscribePayments();
      unsubscribeFeeStructures();
      unsubscribeFeeItems();
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
  
  const pendingInvoices: Invoice[] = React.useMemo(() => {
    if (!currentTerm || students.length === 0 || feeStructures.length === 0 || feeItems.length === 0) {
      return [];
    }

    return students.map(student => {
      const structure = feeStructures.find(fs => fs.classId === student.classId && fs.academicTermId === currentTerm.id);
      if (!structure || !Array.isArray(structure.items)) return null;
      
      const studentPaymentsForTerm = payments.filter(p => p.studentId === student.id && p.academicYear === currentTerm.academicYear && p.term === currentTerm.session);
      const totalPaid = studentPaymentsForTerm.reduce((sum, p) => sum + p.amount, 0);

      const isNew = student.admissionTerm === currentTerm.session && student.admissionYear === currentTerm.academicYear;
      const termNumber = parseInt(currentTerm.session.split(' ')[0], 10);
      
      const paidItemNames = new Set(studentPaymentsForTerm.flatMap(p => p.items?.map(i => i.name) || []));
      
      const applicableFeeItems = structure.items.map(item => {
          const feeItemInfo = feeItems.find(fi => fi.id === item.feeItemId);
          if (!feeItemInfo) return null;
          
          let isApplicable = false;
          // Mandatory items are always applicable based on student status
          if (!feeItemInfo.isOptional) {
              if (isNew) {
                  if (feeItemInfo.appliesTo.includes('new')) isApplicable = true;
              } else {
                  if (termNumber === 1 && feeItemInfo.appliesTo.includes('term1')) isApplicable = true;
                  if (termNumber > 1 && feeItemInfo.appliesTo.includes('term2_3')) isApplicable = true;
              }
          }
          // Optional items are applicable if they've been paid for
          if (feeItemInfo.isOptional && paidItemNames.has(feeItemInfo.name)) {
              isApplicable = true;
          }

          return isApplicable ? { name: feeItemInfo.name, amount: item.amount } : null;
      }).filter(Boolean) as { name: string, amount: number }[];


      const totalAmountDue = applicableFeeItems.reduce((total, item) => total + item.amount, 0);

      const balance = totalAmountDue - totalPaid;
      
      if (balance > 0) {
        return {
          id: student.id,
          studentId: student.id,
          studentName: student.name,
          admissionId: student.admissionId,
          studentClass: student.class,
          amount: balance,
          dueDate: currentTerm.endDate,
          items: applicableFeeItems,
          totalAmount: totalAmountDue,
          amountPaid: totalPaid,
        };
      }
      
      return null;
    }).filter((invoice): invoice is Invoice => invoice !== null);
  }, [students, payments, feeStructures, feeItems, currentTerm]);


  const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);
  const pendingInvoicesTotal = pendingInvoices.reduce((acc, i) => acc + i.amount, 0);
  const revenueThisTerm = currentTerm ? payments.filter(p => p.term === currentTerm.session && p.academicYear === currentTerm.academicYear).reduce((acc, p) => acc + p.amount, 0) : 0;

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
            color="text-blue-500"
        />
        <StatCard 
            title="Current Session"
            value={currentTerm?.session || 'Not Set'}
            icon={BookOpen}
            color="text-green-500"
        />
        {canReadFinancials && (
            <>
                <StatCard 
                    title="Total Revenue"
                    value={`GHS ${totalRevenue.toLocaleString()}`}
                    icon={Wallet}
                    color="text-purple-500"
                    description="All-time payments received"
                />
                <StatCard 
                    title="Revenue (This Term)"
                    value={`GHS ${revenueThisTerm.toLocaleString()}`}
                    icon={Receipt}
                    color="text-indigo-500"
                    description={`For ${currentTerm?.session || ''} ${currentTerm?.academicYear || ''}`}
                />
            </>
        )}
      </div>

       {canReadFinancials && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <StatCard 
                    title="Total Pending Invoices"
                    value={`${pendingInvoices.length}`}
                    icon={Clock}
                    color="text-orange-500"
                    description={`GHS ${pendingInvoicesTotal.toLocaleString()}`}
                />
            </div>
        )}
      
      <PaymentsTable columns={memoizedPaymentColumns} data={payments} />

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
