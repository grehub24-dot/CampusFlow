
'use client'

import React from 'react';
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Payment, Invoice, AcademicTerm, Student, FeeStructure, FeeItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { sendSms } from '@/lib/frog-api';

import { PageHeader } from "@/components/page-header";
import { Receipt, Calendar, BookOpen, Clock } from "lucide-react";
import StatCard from '@/components/dashboard/stat-card';
import { PendingInvoicesTable } from '../dashboard/pending-invoices-table';
import { getInvoiceColumns } from './columns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { StudentDetails } from '@/components/student-details';


export default function InvoicesPage() {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [feeStructures, setFeeStructures] = React.useState<FeeStructure[]>([]);
  const [feeItems, setFeeItems] = React.useState<FeeItem[]>([]);
  const [currentTerm, setCurrentTerm] = React.useState<AcademicTerm | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);
  const [isStudentSheetOpen, setIsStudentSheetOpen] = React.useState(false);


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

  const handleViewStudent = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
        setSelectedStudent(student);
        setIsStudentSheetOpen(true);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find student details.'})
    }
  }

  const handleViewInvoice = (invoice: Invoice) => {
    handleViewStudent(invoice.studentId);
  }

  const handleSendReminder = async (invoice: Invoice) => {
    const student = students.find(s => s.id === invoice.studentId);
    if (!student || !student.guardianPhone) {
        toast({ variant: 'destructive', title: 'Error', description: 'Guardian phone number not found.' });
        return;
    }
    
    const message = `Dear Guardian, this is a friendly reminder that there is an outstanding balance of GHS ${invoice.amount.toFixed(2)} for ${student.name}. Please make a payment at your earliest convenience. Thank you.`;

    toast({ title: 'Sending Reminder...', description: `Sending SMS to ${student.guardianPhone}` });
    const result = await sendSms(student.guardianPhone, message);

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

  const memoizedInvoiceColumns = React.useMemo(
      () => getInvoiceColumns({ onViewInvoice: handleViewInvoice, onSendReminder: handleSendReminder }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [students] 
  );

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
        <PendingInvoicesTable columns={memoizedInvoiceColumns} data={pendingInvoices} />
      </div>
      
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
