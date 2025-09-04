
'use client'

import React from 'react';
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Student, Payment, Invoice, AcademicTerm } from '@/types';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Users, Milestone, Calendar, BookOpen, Wallet, Clock } from "lucide-react";
import StatCard from "@/components/dashboard/stat-card";
import OverviewChart from "@/components/dashboard/overview-chart";
import GenderRatioPieChart from "@/components/dashboard/gender-ratio-pie-chart";
import { RecentPaymentsTable } from "./recent-payments-table";
import { paymentColumns } from "./payment-columns";
import { PendingInvoicesTable } from "./pending-invoices-table";
import { invoiceColumns } from "./invoice-columns";
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PaymentDetails } from '@/components/payment-details';
import { StudentDetails } from '@/components/student-details';

export default function Dashboard() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [currentTerm, setCurrentTerm] = React.useState<AcademicTerm | null>(null);
  const [selectedPayment, setSelectedPayment] = React.useState<Payment | null>(null);
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = React.useState(false);
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
    });

    return () => {
        unsubscribeSettings();
        unsubscribeStudents();
        unsubscribePayments();
        unsubscribeInvoices();
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
  
  const memoizedPaymentColumns = React.useMemo(
      () => paymentColumns({ onViewPayment: handleViewPayment, onViewStudent: handleViewStudent }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [students] 
  );


  const overallStats = {
    totalStudents: students.length,
    maleStudents: students.filter(s => s.gender === 'Male').length,
    femaleStudents: students.filter(s => s.gender === 'Female').length,
    totalRevenue: payments.reduce((acc, p) => acc + (p.status === 'Paid' ? p.amount : 0), 0),
    pendingInvoices: invoices.reduce((acc, i) => acc + i.amount, 0),
  };

  const newlyAdmittedStudents = students.filter(s => s.admissionYear === currentTerm?.academicYear && s.admissionTerm === currentTerm?.session);

  const admissionStats = {
    totalNewStudents: newlyAdmittedStudents.length,
    maleStudents: newlyAdmittedStudents.filter(s => s.gender === 'Male').length,
    femaleStudents: newlyAdmittedStudents.filter(s => s.gender === 'Female').length,
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
        />
        <StatCard 
            title="Current Session"
            value={currentTerm?.session || 'Not Set'}
            icon={BookOpen}
        />
        <StatCard 
            title="Total Revenue"
            value={`GHS ${overallStats.totalRevenue.toLocaleString()}`}
            icon={Wallet}
        />
        <StatCard 
            title="Pending Invoices"
            value={`GHS ${overallStats.pendingInvoices.toLocaleString()}`}
            icon={Clock}
        />
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
              <RecentPaymentsTable columns={memoizedPaymentColumns} data={payments} />
              <PendingInvoicesTable columns={invoiceColumns} data={invoices} />
          </div>
        </TabsContent>
        <TabsContent value="admissions" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
                 <StatCard
                  title="New Admissions (This Term)"
                  value={admissionStats.totalNewStudents.toLocaleString()}
                  icon={Users}
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
    </>
  );
}
