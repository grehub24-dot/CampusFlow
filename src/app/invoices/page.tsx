
'use client'

import React from 'react';
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Payment, Invoice, AcademicTerm, Student, FeeStructure, FeeItem, IntegrationSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { sendSms } from '@/lib/frog-api';

import { PageHeader } from "@/components/page-header";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Receipt, Calendar, BookOpen, Clock } from "lucide-react";
import StatCard from '@/components/dashboard/stat-card';
import { InvoicesTable } from './invoices-table';
import { getInvoiceColumns } from './columns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { InvoiceDetails } from '@/components/invoice-details';
import PaymentForm from '../payments/payment-form';

export default function InvoicesPage() {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [feeStructures, setFeeStructures] = React.useState<FeeStructure[]>([]);
  const [feeItems, setFeeItems] = React.useState<FeeItem[]>([]);
  const [currentTerm, setCurrentTerm] = React.useState<AcademicTerm | null>(null);
  const [integrationSettings, setIntegrationSettings] = React.useState<IntegrationSettings | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [isInvoiceSheetOpen, setIsInvoiceSheetOpen] = React.useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);


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
    
    const integrationsSettingsRef = doc(db, "settings", "integrations");
    const unsubscribeIntegrations = onSnapshot(integrationsSettingsRef, (doc) => {
        setIntegrationSettings(doc.data() as IntegrationSettings);
    });

    return () => {
      unsubscribeSettings();
      unsubscribePayments();
      unsubscribeStudents();
      unsubscribeFeeStructures();
      unsubscribeFeeItems();
      unsubscribeIntegrations();
    };
  }, []);

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsInvoiceSheetOpen(true);
  }

  const handlePay = (invoice: Invoice) => {
    const student = students.find(s => s.id === invoice.studentId);
    if (student) {
        if (currentTerm) {
            const studentForPayment = {
                ...student,
                isNewAdmission: student.admissionTerm === currentTerm.session && student.admissionYear === currentTerm.academicYear,
                currentTermNumber: parseInt(currentTerm.session.split(' ')[0], 10)
            }
            setSelectedStudent(studentForPayment);
        } else {
            setSelectedStudent(student);
        }
        setIsPaymentDialogOpen(true);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find student to process payment.' });
    }
  }

  const handleSendReminder = async (invoice: Invoice) => {
    if (!integrationSettings?.smsOnFeeReminder) {
        toast({ variant: 'destructive', title: 'Reminders Disabled', description: 'SMS reminders for fees are currently disabled in settings.' });
        return;
    }
    
    const student = students.find(s => s.id === invoice.studentId);
    if (!student || !student.guardianPhone) {
        toast({ variant: 'destructive', title: 'Error', description: 'Guardian phone number not found.' });
        return;
    }
    
    const message = `Dear Guardian, this is a friendly reminder that there is an outstanding balance of GHS ${invoice.amount.toFixed(2)} for ${student.name}. Please make a payment at your earliest convenience. Thank you.`;

    toast({ title: 'Sending Reminder...', description: `Sending SMS to ${student.guardianPhone}` });
    const result = await sendSms([student.guardianPhone], message);

    if (result.success) {
        toast({ title: 'Reminder Sent', description: `SMS reminder sent successfully to ${student.name}'s guardian.` });
    } else {
        toast({ variant: 'destructive', title: 'Failed to Send', description: result.error });
    }
  }
  
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
          if (!feeItemInfo.isOptional) {
              const appliesToNew = feeItemInfo.appliesTo.includes('new');
              const appliesToTerm1 = feeItemInfo.appliesTo.includes('term1');
              const appliesToTerm23 = feeItemInfo.appliesTo.includes('term2_3');

              if (isNew) {
                  if (appliesToNew || (termNumber === 1 && appliesToTerm1) || (termNumber > 1 && appliesToTerm23)) {
                      isApplicable = true;
                  }
              } else {
                  if ((termNumber === 1 && appliesToTerm1) || (termNumber > 1 && appliesToTerm23)) {
                      isApplicable = true;
                  }
              }
          }
          
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

  const memoizedInvoiceColumns = React.useMemo(
      () => getInvoiceColumns({ onViewInvoice: handleViewInvoice, onSendReminder: handleSendReminder, onPay: handlePay }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [students, integrationSettings] 
  );

  const pendingInvoicesTotal = pendingInvoices.reduce((acc, i) => acc + i.amount, 0);
  const revenueThisTerm = currentTerm ? payments.filter(p => p.term === currentTerm.session && p.academicYear === currentTerm.academicYear).reduce((acc, p) => acc + p.amount, 0) : 0;

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
            color="text-blue-500"
        />
        <StatCard 
            title="Current Session"
            value={currentTerm?.session || 'Not Set'}
            icon={BookOpen}
            color="text-green-500"
        />
        <StatCard 
            title="Revenue (This Term)"
            value={`GHS ${revenueThisTerm.toLocaleString()}`}
            icon={Receipt}
            color="text-purple-500"
            description={`For ${currentTerm?.session || ''} ${currentTerm?.academicYear || ''}`}
        />
        <StatCard 
            title="Total Pending Invoices"
            value={`${pendingInvoices.length}`}
            icon={Clock}
            color="text-orange-500"
            description={`GHS ${pendingInvoicesTotal.toLocaleString()}`}
        />
      </div>

      <div>
        <InvoicesTable columns={memoizedInvoiceColumns} data={pendingInvoices} />
      </div>
      
       <Sheet open={isInvoiceSheetOpen} onOpenChange={setIsInvoiceSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Invoice Details</SheetTitle>
          </SheetHeader>
          {selectedInvoice && <InvoiceDetails invoice={selectedInvoice} />}
        </SheetContent>
      </Sheet>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
            <DialogTitle>Record New Payment</DialogTitle>
            <DialogDescription>Fill out the form below to record a new financial transaction.</DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto p-1">
                {currentTerm && selectedStudent && (
                  <PaymentForm 
                    students={students} 
                    feeStructures={feeStructures}
                    payments={payments}
                    currentTerm={currentTerm}
                    onSuccess={() => setIsPaymentDialogOpen(false)}
                    defaultStudentId={selectedStudent.id}
                  />
                )}
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
