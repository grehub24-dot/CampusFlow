
'use client'

import React, { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, doc, addDoc, query, getDocs, where, writeBatch } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { format, getYear } from 'date-fns';
import { Loader2, PlayCircle } from 'lucide-react';
import { PayrollHistory } from './payroll-history';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { StaffMember, PayrollRun } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';

const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
];

const years = Array.from({ length: 5 }, (_, i) => getYear(new Date()) - i);

export default function PayrollPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MMMM'));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const staffQuery = query(collection(db, "staff"));
    const unsubscribeStaff = onSnapshot(staffQuery, (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember)));
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
      const grossSalaryPerMonth = employee.grossSalary / 12;
      const arrearsTotal = employee.arrears?.reduce((acc, d) => acc + d.amount, 0) || 0;
      
      const earnings = grossSalaryPerMonth + arrearsTotal;
      
      const ssnitEmployee = grossSalaryPerMonth * 0.055;
      const ssnitEmployer = grossSalaryPerMonth * 0.13;
      const taxableIncome = earnings - ssnitEmployee;
      
      let incomeTax = 0;
      // Simplified tax calculation for monthly income
      if (taxableIncome > 490) {
        if (taxableIncome <= 600) incomeTax = (taxableIncome - 490) * 0.05;
        else if (taxableIncome <= 730) incomeTax = 5.5 + (taxableIncome - 600) * 0.10;
        else if (taxableIncome <= 3000) incomeTax = 18.5 + (taxableIncome - 730) * 0.175;
        else if (taxableIncome <= 16491.67) incomeTax = 415.75 + (taxableIncome - 3000) * 0.25;
        else if (taxableIncome <= 50000) incomeTax = 3788.67 + (taxableIncome - 16491.67) * 0.30;
        else incomeTax = 13841.17 + (taxableIncome - 50000) * 0.35;
      }

      const customDeductionsTotal = employee.deductions?.reduce((acc, d) => acc + d.amount, 0) || 0;
      const totalDeductions = ssnitEmployee + incomeTax + customDeductionsTotal;
      const netSalary = earnings - totalDeductions;

      return {
          grossSalary: grossSalaryPerMonth,
          ssnitEmployee,
          ssnitEmployer,
          incomeTax,
          netSalary,
          deductions: employee.deductions || [],
          arrears: employee.arrears || [],
      };
  };

  const handleRunPayroll = async () => {
    setIsProcessing(true);
    const period = `${selectedMonth} ${selectedYear}`;
    
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
        const batch = writeBatch(db);

        const payslips = activeStaff.map(employee => {
            const calculated = calculatePayrollForEmployee(employee);
            
            // Clear arrears after calculating them for this payroll
            const staffRef = doc(db, "staff", employee.id);
            batch.update(staffRef, { arrears: [] });

            return {
                id: employee.id,
                staffName: employee.name,
                period: period,
                grossSalary: calculated.grossSalary,
                ssnitEmployee: calculated.ssnitEmployee,
                ssnitEmployer: calculated.ssnitEmployer,
                incomeTax: calculated.incomeTax,
                netSalary: calculated.netSalary,
                deductions: calculated.deductions,
                arrears: calculated.arrears,
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

        const payrollRunRef = doc(collection(db, "payroll-runs"));
        batch.set(payrollRunRef, newPayrollRun);
        
        await batch.commit();
        
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
        title="Payroll"
        description="Run monthly payroll and view historical records."
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
                Select the period to process payroll for all active staff. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <Label htmlFor="month">Month</Label>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger id="month"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                        </Select>
                     </div>
                     <div>
                        <Label htmlFor="year">Year</Label>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger id="year"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                     </div>
                </div>
                 <p className="text-sm text-center text-muted-foreground">
                    You are about to run payroll for <strong>{selectedMonth} {selectedYear}</strong>.
                 </p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRunPayroll} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Yes, Run Payroll'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageHeader>
      
      <PayrollHistory payrollRuns={payrollRuns} isLoading={isLoadingRuns} />
    </>
  );
}
