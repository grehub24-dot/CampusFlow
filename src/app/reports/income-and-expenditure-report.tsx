
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useSchoolInfo } from '@/context/school-info-context';
import Image from 'next/image';
import { format, endOfMonth, startOfMonth, isWithinInterval, subMonths } from 'date-fns';
import type { Payment, Transaction, Student, AcademicTerm } from '@/types';

interface ReportProps {
  payments: Payment[];
  transactions: Transaction[];
  students: Student[];
  currentTerm: AcademicTerm | null;
}

export function IncomeAndExpenditureReport({ payments, transactions, students, currentTerm }: ReportProps) {
  const { schoolInfo, loading } = useSchoolInfo();

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const input = document.getElementById('income-expenditure-report');
    if (input) {
      html2canvas(input, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 15;
        pdf.addImage(
          imgData,
          'PNG',
          imgX,
          imgY,
          imgWidth * ratio,
          imgHeight * ratio
        );
        pdf.save('income-expenditure-report.pdf');
      });
    }
  };
  
  const today = new Date();
  const reportDate = endOfMonth(today);
  const reportMonthStart = startOfMonth(today);
  const prevMonth = subMonths(today, 1);
  
  const monthlyPayments = payments.filter(p => isWithinInterval(new Date(p.date), { start: reportMonthStart, end: reportDate }));
  const monthlyTransactions = transactions.filter(t => isWithinInterval(new Date(t.date), { start: reportMonthStart, end: reportDate }));

  // --- Calculate Balance Brought Forward ---
  const previousPayments = payments.filter(p => new Date(p.date) < reportMonthStart);
  const previousTransactions = transactions.filter(t => new Date(t.date) < reportMonthStart);

  const previousIncomeFromPayments = previousPayments.reduce((sum, p) => sum + p.amount, 0);
  const previousOtherIncome = previousTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const previousExpenses = previousTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balanceBroughtForward = previousIncomeFromPayments + previousOtherIncome - previousExpenses;
  // --- End Balance B/F Calculation ---

  const incomeFromPayments = monthlyPayments.reduce((acc, payment) => {
    payment.items?.forEach(item => {
      const student = students.find(s => s.id === payment.studentId);
      const isNew = student?.admissionTerm === currentTerm?.session && student?.admissionYear === currentTerm?.academicYear;
      
      let category = item.name;
      if (item.name.toLowerCase().includes('school fees')) {
        category = isNew ? 'New Admissions School fees' : 'Termly School fees (Old Students) & Recovered';
      } else if (item.name.toLowerCase().includes('books')) {
        category = isNew ? 'Books - New Admissions' : 'Books - Sold to Old Students';
      } else if (item.name.toLowerCase().includes('uniform')) {
        category = isNew ? 'School Uniforms - New Admissions' : 'School Uniforms - Old Students';
      }

      acc[category] = (acc[category] || 0) + item.amount;
    });
    return acc;
  }, {} as Record<string, number>);

  const otherIncome = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => {
        const category = t.categoryName === 'Printing & Photocopying' ? 'Extra From Printing and Our-day' : t.categoryName;
        acc[category] = (acc[category] || 0) + t.amount;
        return acc;
    }, {} as Record<string, number>);
    
  const allIncome = {...incomeFromPayments, ...otherIncome};
  const totalMonthlyIncome = Object.values(allIncome).reduce((sum, amount) => sum + amount, 0);
  const totalIncome = totalMonthlyIncome + balanceBroughtForward;


  const expenses = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
        let category = t.categoryName;
        if(t.categoryName === 'Canteen Supplies') category = 'Canteen Food';
        if(t.categoryName === 'Transportation (Fuel/Maintenance)') category = 'Bus Fuel'; // Simplified
        acc[category] = (acc[category] || 0) + t.amount;
        return acc;
    }, {} as Record<string, number>);

  const totalExpenses = Object.values(expenses).reduce((sum, amount) => sum + amount, 0);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };


  if (loading || !schoolInfo) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const incomeItems = [
      { label: `Bal B/F (${format(prevMonth, 'MMMM, yyyy')})`, value: balanceBroughtForward },
      { label: 'Canteen Fee', value: allIncome['Canteen Fees'] || 0 },
      { label: 'Transport', value: allIncome['Transport Fees'] || 0 },
      { label: 'New Admissions School fees', value: allIncome['New Admissions School fees'] || 0 },
      { label: 'Termly School fees (Old Students) & Recovered', value: allIncome['Termly School fees (Old Students) & Recovered'] || 0 },
      { label: 'Books - Sold to Old Students', value: allIncome['Books - Sold to Old Students'] || 0 },
      { label: 'Books - New Admissions', value: allIncome['Books - New Admissions'] || 0 },
      { label: 'School Uniforms - New Admissions', value: allIncome['School Uniforms - New Admissions'] || 0 },
      { label: 'School Uniforms - Old Students', value: allIncome['School Uniforms - Old Students'] || 0 },
      { label: 'Extra From Printing and Our-day', value: allIncome['Extra From Printing and Our-day'] || 0 },
  ];

  const expenseItems = [
      { label: `Salary (${format(today, 'MMMM')})`, value: expenses['Salary'] || 0 },
      { label: 'Canteen Food', value: expenses['Canteen Food'] || 0 },
      { label: 'Petty Expense', value: expenses['Petty Expenses'] || 0 },
      { label: "Teacher's Motivation", value: expenses["Teachers Motivation"] || 0 },
      { label: 'Bus Fuel', value: expenses['Bus Fuel'] || 0 },
      { label: 'Bus Maintenance', value: expenses['Repairs & Maintenance'] || 0 },
      { label: 'Water Bill / Water Supply', value: expenses['Utilities (Water/Electricity)'] || 0 },
      { label: 'Tel. Charges', value: expenses['Administrative Costs'] || 0 },
  ];

  return (
    <div className="p-4 bg-white">
      <div id="income-expenditure-report" className="printable-area financial-report-container p-6">
        <header className="text-center mb-6 space-y-1">
          <div className="flex justify-center items-center gap-16 mb-4">
              <Image src={schoolInfo.logoUrl || '/logo.jpg'} alt="School Logo" width={100} height={100} className="object-contain" />
              <div>
                  <h1 className="text-xl font-bold">{schoolInfo.schoolName}</h1>
                  <p className="text-sm">{schoolInfo.location}</p>
                  <p className="text-sm">{schoolInfo.phone}</p>
              </div>
              <Image src={schoolInfo.logoUrl || '/logo.jpg'} alt="School Logo" width={100} height={100} className="object-contain" />
          </div>
          <h3>Income and Expenditure Account</h3>
          <h4>(As at {format(reportDate, 'do MMMM yyyy')})</h4>
        </header>

        {/* Income Table */}
        <table>
          <thead>
            <tr className="main-header">
              <th>INCOME</th>
              <th className="sub-amount-col">GHC</th>
              <th className="amount-col">GHC</th>
            </tr>
          </thead>
          <tbody>
            {incomeItems.map(item => (
                <tr key={item.label}>
                    <td>{item.label}</td>
                    <td className="sub-amount-col">-</td>
                    <td className="amount-col">{item.value !== 0 ? formatCurrency(item.value) : '-'}</td>
                </tr>
            ))}
            <tr className="total-row">
                <td>TOTAL INCOME</td>
                <td className="sub-amount-col"></td>
                <td className="amount-col">{formatCurrency(totalIncome)}</td>
            </tr>
          </tbody>
        </table>

        {/* Expenses Table */}
        <table className="mt-8">
            <thead>
                <tr className="main-header">
                <th>LESS EXPENSES</th>
                <th className="sub-amount-col">GHC</th>
                <th className="amount-col">GHC</th>
                </tr>
            </thead>
            <tbody>
                {expenseItems.map(item => (
                     <tr key={item.label}>
                        <td>{item.label}</td>
                        <td className="sub-amount-col">{item.value > 0 ? formatCurrency(item.value) : '-'}</td>
                        <td className="amount-col">-</td>
                    </tr>
                ))}
                 <tr className="total-row">
                    <td>TOTAL EXPENSES</td>
                    <td className="sub-amount-col"></td>
                    <td className="amount-col">{formatCurrency(totalExpenses)}</td>
                </tr>
                 <tr className="total-row">
                    <td>NET BALANCE</td>
                    <td className="sub-amount-col"></td>
                    <td className="amount-col">{formatCurrency(totalIncome - totalExpenses)}</td>
                </tr>
            </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end gap-2 no-print">
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
        <Button onClick={handleExportPDF}>
          Export as PDF
        </Button>
      </div>
    </div>
  );
}
