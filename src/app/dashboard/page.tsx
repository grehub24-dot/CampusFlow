'use client'

import React from 'react';
import { collection, onSnapshot, query, where, orderBy, limit, doc } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Student, Payment, Invoice, AcademicTerm, FeeStructure, FeeItem, IntegrationSettings } from '@/types';
import { sendSms } from '@/lib/frog-api';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Users, Milestone, Calendar, BookOpen, Wallet, Clock, UserPlus } from "lucide-react";
import StatCard from "@/components/dashboard/stat-card";
import OverviewChart from "@/components/dashboard/overview-chart";
import GenderRatioPieChart from "@/components/dashboard/gender-ratio-pie-chart";
import { RecentPaymentsTable } from "./recent-payments-table";
import { paymentColumns } from "./payment-columns";
import { PendingInvoicesTable } from "./pending-invoices-table";
import { getInvoiceColumns } from "./invoice-columns";
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PaymentDetails } from '@/components/payment-details';
import { StudentDetails } from '@/components/student-details';
import { InvoiceDetails } from '@/components/invoice-details';
import PaymentForm from '../payments/payment-form';
import { useAuth } from '@/context/auth-context';

export default function Dashboard() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [recentPayments, setRecentPayments] = React.useState<Payment[]>([]);
  const [feeStructures, setFeeStructures] = React.useState<FeeStructure[]>([]);
  const [feeItems, setFeeItems] = React.useState<FeeItem[]>([]);
  const [currentTerm, setCurrentTerm] = React.useState<AcademicTerm | null>(null);
  const [selectedPayment, setSelectedPayment] = React.useState<Payment | null>(null);
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = React.useState(false);
  const [isStudentSheetOpen, setIsStudentSheetOpen] = React.useState(false);
  const [isInvoiceSheetOpen, setIsInvoiceSheetOpen] = React.useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false);
  const [integrationSettings, setIntegrationSettings] = React.useState<IntegrationSettings | null>(null);
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
    }, (error) => {
      console.error("Error fetching students:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch students." });
    });
    
    const allPaymentsQuery = query(collection(db, "payments"), orderBy("date", "desc"));
    const unsubscribePayments = onSnapshot(allPaymentsQuery, (querySnapshot) => {
      const paymentsData: Payment[] = [];
      querySnapshot.forEach((doc) => {
        paymentsData.push({ id: doc.id, ...doc.data() } as Payment);
      });
      setPayments(paymentsData);
    });

    const recentPaymentsQuery = query(collection(db, "payments"), orderBy("date", "desc"), limit(5));
     const unsubscribeRecentPayments = onSnapshot(recentPaymentsQuery, (querySnapshot) => {
      const paymentsData: Payment[] = [];
      querySnapshot.forEach((doc) => {
        paymentsData.push({ id: doc.id, ...doc.data() } as Payment);
      });
      setRecentPayments(paymentsData);
    });

    const feeStructuresQuery = query(collection(db, "fee-structures"));
    const unsubscribeFeeStructures = onSnapshot(feeStructuresQuery, (snapshot) => {
        setFeeStructures(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeStructure)));
    });
    
    const feeItemsQuery = query(collection(db, "fee-items"));
    const unsubscribeFeeItems = onSnapshot(feeItemsQuery, (snapshot) => {
        setFeeItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeItem)));
    });

    const integrationsSettingsRef = doc(db, "settings", "integrations");
    const unsubscribeIntegrations = onSnapshot(integrationsSettingsRef, (doc) => {
        setIntegrationSettings(doc.data() as IntegrationSettings);
    });

    return () => {
        unsubscribeSettings();
        unsubscribeStudents();
        unsubscribePayments();
        unsubscribeRecentPayments();
        unsubscribeFeeStructures();
        unsubscribeFeeItems();
        unsubscribeIntegrations();
    };
  }, [toast]);
  
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

  const memoizedPaymentColumns = React.useMemo(
      () => paymentColumns({ onViewPayment: handleViewPayment, onViewStudent: handleViewStudent }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [students] 
  );

  const memoizedInvoiceColumns = React.useMemo(
      () => getInvoiceColumns({ onViewInvoice: handleViewInvoice, onSendReminder: handleSendReminder, onPay: handlePay }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [students, integrationSettings] 
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


  const overallStats = {
    totalStudents: students.length,
    maleStudents: students.filter(s => s.gender === 'Male').length,
    femaleStudents: students.filter(s => s.gender === 'Female').length,
    totalRevenue: payments.reduce((acc, p) => acc + (p.amount), 0),
    pendingInvoices: pendingInvoices.reduce((acc, i) => acc + i.amount, 0),
  };

  const newlyAdmittedStudents = React.useMemo(() => {
    if (!currentTerm) return [];
    const termStartDate = new Date(currentTerm.startDate);
    const termEndDate = new Date(currentTerm.endDate);
    
    return students.filter(s => {
      if (!s.admissionDate) return false;
      const admissionDate = new Date(s.admissionDate);
      return admissionDate >= termStartDate && admissionDate <= termEndDate;
    });
  }, [students, currentTerm]);

  const admissionStats = {
    totalNewStudents: newlyAdmittedStudents.length,
    maleStudents: newlyAdmittedStudents.filter(s => s.gender === 'Male').length,
    femaleStudents: newlyAdmittedStudents.filter(s => s.gender === 'Female').length,
    continuingStudents: students.length - newlyAdmittedStudents.length,
  };

  const classEnrollment = students.reduce((acc, student) => {
    const existingClass = acc.find(c => c.name === student.class);
    if (existingClass) {
        existingClass.students += 1;
    } else {
        acc.push({ name: student.class, students: 1 });
    }
    return acc;
  }, [] as { name: string; students: number }[]).sort((a, b) => a.name.localeCompare(b.name));
  
  const admissionClassEnrollment = newlyAdmittedStudents
    .reduce((acc, student) => {
        const existingClass = acc.find(c => c.name === student.class);
        if (existingClass) {
            existingClass.students += 1;
        } else {
            acc.push({ name: student.class, students: 1 });
        }
        return acc;
  }, [] as { name: string; students: number }[]).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Welcome! Here's a summary of your school's data."
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
        {canReadFinancials && (
            <>
                <StatCard 
                    title="Total Revenue"
                    value={`GHS ${overallStats.totalRevenue.toLocaleString()}`}
                    icon={Wallet}
                    color="text-purple-500"
                />
                <StatCard 
                    title="Pending Invoices"
                    value={`GHS ${overallStats.pendingInvoices.toLocaleString()}`}
                    icon={Clock}
                    color="text-orange-500"
                />
            </>
        )}
      </div>

      <Tabs defaultValue="overall" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overall">Overall Analytics</TabsTrigger>
          <TabsTrigger value="admissions">Admissions</TabsTrigger>
        </TabsList>
        <TabsContent value="overall" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Total Students"
              value={overallStats.totalStudents.toLocaleString()}
              icon={Users}
              color="text-indigo-500"
            />
            <StatCard
              title="Male Students"
              value={overallStats.maleStudents.toLocaleString()}
              icon={User}
              color="text-blue-500"
            />
            <StatCard
              title="Female Students"
              value={overallStats.femaleStudents.toLocaleString()}
              icon={User}
              color="text-pink-500"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Class Enrollment</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <OverviewChart data={classEnrollment} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <GenderRatioPieChart data={{ male: overallStats.maleStudents, female: overallStats.femaleStudents }} />
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RecentPaymentsTable columns={memoizedPaymentColumns} data={recentPayments} />
              <PendingInvoicesTable columns={memoizedInvoiceColumns} data={pendingInvoices} />
          </div>
        </TabsContent>
        <TabsContent value="admissions" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                 <StatCard
                  title="New Admissions (This Term)"
                  value={admissionStats.totalNewStudents.toLocaleString()}
                  icon={UserPlus}
                  color="text-indigo-500"
                />
                <StatCard
                  title="Continuing Students"
                  value={admissionStats.continuingStudents.toLocaleString()}
                  icon={Users}
                  color="text-blue-500"
                />
                <StatCard
                  title="Male Admissions"
                  value={admissionStats.maleStudents.toLocaleString()}
                  icon={User}
                  color="text-blue-500"
                />
                <StatCard
                  title="Female Admissions"
                  value={admissionStats.femaleStudents.toLocaleString()}
                  icon={User}
                  color="text-pink-500"
                />
            </div>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Admissions by Class</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <OverviewChart data={admissionClassEnrollment} />
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Admission Gender Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <GenderRatioPieChart data={{ male: admissionStats.maleStudents, female: admissionStats.femaleStudents }} />
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
      </Tabs>
      
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
                    students={[selectedStudent]} 
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
