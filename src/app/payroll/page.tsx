
'use client'

import React, { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, doc, addDoc, query } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { Loader2, PlayCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffManagement } from './staff-management';
import { PayrollHistory } from './payroll-history';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { StaffMember, PayrollRun } from '@/types';

export default function PayrollPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [isLoadingRuns, setIsLoadingRuns] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const staffQuery = query(collection(db, "staff"));
    const unsubscribeStaff = onSnapshot(staffQuery, (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember)));
      setIsLoadingStaff(false);
    });

    const runsQuery = query(collection(db, "payroll-runs"));
    const unsubscribeRuns = onSnapshot(runsQuery, (snapshot) => {
      setPayrollRuns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayrollRun)));
      setIsLoadingRuns(false);
    });

    return () => {
      unsubscribeStaff();
      unsubscribeRuns();
    };
  }, []);

  const calculatePayrollForEmployee = (employee: StaffMember) => {
      const gross = employee.grossSalary;
      const ssnitEmployee = gross * 0.055;
      const ssnitEmployer = gross * 0.13;
      const taxableIncome = gross - ssnitEmployee;
      
      // Simplified tax calculation for demonstration
      let incomeTax = 0;
      if (taxableIncome > 3000) incomeTax = (taxableIncome - 3000) * 0.25;
      else if (taxableIncome > 1000) incomeTax = (taxableIncome - 1000) * 0.175;
      else if (taxableIncome > 500) incomeTax = (taxableIncome - 500) * 0.1;

      const netSalary = taxableIncome - incomeTax;

      return {
          ...employee,
          ssnitEmployee: ssnitEmployee,
          ssnitEmployer: ssnitEmployer,
          taxableIncome: taxableIncome,
          incomeTax: incomeTax,
          netSalary: netSalary,
      };
  };

  const handleRunPayroll = async () => {
    setIsProcessing(true);
    const period = format(new Date(), 'MMMM yyyy');
    
    const existingRun = payrollRuns.find(run => run.period === period);
    if (existingRun) {
        toast({
            variant: 'destructive',
            title: 'Payroll Already Exists',
            description: `A payroll run for ${period} has already been processed.`,
        });
        setIsProcessing(false);
        return;
    }

    const activeStaff = staff.filter(s => s.status === 'Active');
    if (activeStaff.length === 0) {
        toast({ variant: 'destructive', title: 'No Active Staff', description: 'There are no active staff members to run payroll for.' });
        setIsProcessing(false);
        return;
    }
    
    try {
        const payslips = activeStaff.map(employee => {
            const calculated = calculatePayrollForEmployee(employee);
            return {
                id: calculated.id,
                staffName: calculated.name,
                period: period,
                grossSalary: calculated.grossSalary,
                ssnitEmployee: calculated.ssnitEmployee,
                incomeTax: calculated.incomeTax,
                netSalary: calculated.netSalary,
            };
        });

        const totalAmount = payslips.reduce((sum, p) => sum + p.netSalary, 0);

        const newPayrollRun = {
            runDate: new Date().toISOString(),
            period: period,
            totalAmount: totalAmount,
            employeeCount: activeStaff.length,
            payslips: payslips,
        };

        await addDoc(collection(db, "payroll-runs"), newPayrollRun);
        
        toast({
            title: 'Payroll Processed',
            description: `Payroll for ${period} has been successfully processed for ${activeStaff.length} employees.`,
        });

    } catch (error) {
        console.error("Error running payroll:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to process payroll.' });
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Payroll Management"
        description="Manage staff salaries, deductions, and payment schedules."
      >
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button>
              <PlayCircle className="mr-2 h-4 w-4" />
              Run New Payroll
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Payroll Run</AlertDialogTitle>
              <AlertDialogDescription>
                This will process payroll for all active staff for the current month, <strong>{format(new Date(), 'MMMM yyyy')}</strong>. This action cannot be undone. Are you sure you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRunPayroll} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Yes, Run Payroll'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageHeader>
      
      <Tabs defaultValue="staff">
          <TabsList>
              <TabsTrigger value="staff">Staff Management</TabsTrigger>
              <TabsTrigger value="history">Payroll History</TabsTrigger>
          </TabsList>
          <TabsContent value="staff">
              <StaffManagement staff={staff} isLoading={isLoadingStaff} />
          </TabsContent>
          <TabsContent value="history">
              <PayrollHistory payrollRuns={payrollRuns} isLoading={isLoadingRuns} />
          </TabsContent>
      </Tabs>
    </>
  );
}
