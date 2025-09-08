
'use client'

import React, { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, doc, addDoc, query, getDocs, where, writeBatch } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { format, getYear } from 'date-fns';
import { Loader2, PlayCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffManagement } from './staff-management';
import { PayrollHistory } from './payroll-history';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { StaffMember, PayrollRun } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
];

const years = Array.from({ length: 5 }, (_, i) => getYear(new Date()) - i);

export default function PayrollPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [isLoadingRuns, setIsLoadingRuns] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MMMM'));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));
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
      const taxableIncome = gross - ssnitEmployee;
      
      let incomeTax = 0;
      // Note: This is a simplified tax calculation.
      // In a real-world scenario, consult the official graduated rates from the GRA.
      if (taxableIncome > 50000) incomeTax += (taxableIncome - 50000) * 0.35;
      if (taxableIncome > 10000) incomeTax += (Math.min(taxableIncome, 50000) - 10000) * 0.30;
      if (taxableIncome > 3000) incomeTax += (Math.min(taxableIncome, 10000) - 3000) * 0.25;
      if (taxableIncome > 1000) incomeTax += (Math.min(taxableIncome, 3000) - 1000) * 0.175;
      if (taxableIncome > 500) incomeTax += (Math.min(taxableIncome, 1000) - 500) * 0.10;
      if (taxableIncome > 365) incomeTax += (Math.min(taxableIncome, 500) - 365) * 0.05;


      const customDeductionsTotal = employee.deductions?.reduce((acc, d) => acc + d.amount, 0) || 0;
      const totalDeductions = ssnitEmployee + incomeTax + customDeductionsTotal;
      const netSalary = gross - totalDeductions;

      return {
          ...employee,
          ssnitEmployee,
          incomeTax,
          netSalary,
          deductions: employee.deductions || [],
      };
  };

  const getOrCreateDeductionsCategory = async () => {
    const categoryName = 'Staff Deductions';
    const categoriesRef = collection(db, "transaction-categories");
    const q = query(categoriesRef, where("name", "==", categoryName), where("type", "==", "expense"));
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    } else {
      const newCategory = await addDoc(categoriesRef, {
        name: categoryName,
        type: 'expense'
      });
      return newCategory.id;
    }
  }

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
                deductions: calculated.deductions,
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

        // --- Create expense transactions for deductions ---
        const deductionCategoryId = await getOrCreateDeductionsCategory();
        const batch = writeBatch(db);

        // Add the new payroll run to the batch
        const payrollRunRef = doc(collection(db, "payroll-runs"));
        batch.set(payrollRunRef, newPayrollRun);

        payslips.forEach(payslip => {
            if (payslip.deductions && payslip.deductions.length > 0) {
                payslip.deductions.forEach(deduction => {
                    const transactionRef = doc(collection(db, "transactions"));
                    batch.set(transactionRef, {
                        type: 'expense',
                        amount: deduction.amount,
                        date: new Date().toISOString(),
                        categoryId: deductionCategoryId,
                        categoryName: 'Staff Deductions',
                        description: `Deduction: ${deduction.name} for ${payslip.staffName} - ${period}`,
                    });
                });
            }
        });

        await batch.commit();
        // --- End of expense transaction logic ---
        
        toast({
            title: 'Payroll Processed',
            description: `Payroll for ${period} has been successfully processed for ${activeStaff.length} employees. Deductions recorded as expenses.`,
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
