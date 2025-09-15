'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useSchoolInfo } from '@/context/school-info-context';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

export function IncomeAndExpenditureReport() {
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
  
  if (loading || !schoolInfo) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 bg-white">
      <div id="income-expenditure-report" className="printable-area financial-report-container p-6">
        <header className="text-center mb-6 space-y-1">
          <div className="flex justify-center items-center gap-8 mb-4">
              <Image src={schoolInfo.logoUrl || '/logo.jpg'} alt="School Logo" width={60} height={60} className="object-contain" />
              <div>
                  <h1>{schoolInfo.schoolName}</h1>
                  <h2>EDUCATIONAL COMPLEX</h2>
              </div>
              <Image src={schoolInfo.logoUrl || '/logo.jpg'} alt="School Logo" width={60} height={60} className="object-contain" />
          </div>
          <h3>Income and Expenditure Account</h3>
          <h4>(As at 30th June 2025)</h4>
        </header>

        {/* Income Table */}
        <table>
          <thead>
            <tr className="main-header">
              <th>INCOME</th>
              <th className="amount-col">GHC</th>
              <th className="amount-col">GHC</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Bal B/F (May 2025)</td><td className="amount-col"></td><td className="amount-col">124,233.64</td></tr>
            <tr><td>Canteen Fee</td><td className="amount-col"></td><td className="amount-col">16,630.00</td></tr>
            <tr><td>Transport</td><td className="amount-col"></td><td className="amount-col">2,481.00</td></tr>
            <tr><td>New Admissions School fees</td><td className="amount-col"></td><td className="amount-col">1,410.00</td></tr>
            <tr><td>Termly School fees (Old Students) & Recovered</td><td className="amount-col"></td><td className="amount-col">11,800.00</td></tr>
            <tr><td>Books - Sold to Old Students</td><td className="amount-col">-</td><td className="amount-col"></td></tr>
            <tr><td>Books - New Admissions</td><td className="amount-col"></td><td className="amount-col">410.00</td></tr>
            <tr><td>School Uniforms - New Admissions</td><td className="amount-col"></td><td className="amount-col">980.00</td></tr>
            <tr><td>School Uniforms - Old Students</td><td className="amount-col"></td><td className="amount-col">240.00</td></tr>
            <tr><td>Extra From Printing and Our-day</td><td className="amount-col">-</td><td className="amount-col"></td></tr>
            <tr className="total-row"><td>TOTAL INCOME</td><td className="amount-col"></td><td className="amount-col">157,484.64</td></tr>
          </tbody>
        </table>

        {/* Expenses Table */}
        <table>
            <thead>
                <tr className="main-header">
                <th>LESS EXPENSES</th>
                <th className="amount-col">GHC</th>
                <th className="amount-col">GHC</th>
                </tr>
            </thead>
            <tbody>
                <tr><td><strong>Salary (June)</strong></td><td className="amount-col"></td><td className="amount-col"><strong>6,400.00</strong></td></tr>
                <tr><td>Canteen Food (16/06/25) Food for Stuff - Canteen</td><td className="amount-col"></td><td className="amount-col">130.00</td></tr>
                <tr><td className="font-semibold">Petty Expense</td><td className="amount-col"></td><td className="amount-col"></td></tr>
                <tr><td className="sub-item">(02/06/25) Envelopes</td><td className="sub-amount-col">25.00</td><td className="amount-col"></td></tr>
                <tr><td className="sub-item">(06/06/25) First Aid-items</td><td className="sub-amount-col">32.50</td><td className="amount-col"></td></tr>
                <tr><td className="sub-item">(13/06/25) 1v1 for pupils</td><td className="sub-amount-col">20.00</td><td className="amount-col"></td></tr>
                <tr><td className="sub-item">(13/06/25) Refuse</td><td className="sub-amount-col">50.00</td><td className="amount-col"></td></tr>
                <tr><td className="sub-item">(16/06/25) After Wash</td><td className="sub-amount-col">10.00</td><td className="amount-col"></td></tr>
                <tr><td className="sub-item">(17/06/25) Prize</td><td className="sub-amount-col">170.00</td><td className="amount-col"></td></tr>
                <tr><td className="sub-item">(18/06/25) Rubber bag</td><td className="sub-amount-col">10.00</td><td className="amount-col"></td></tr>
                <tr><td className="sub-item">(18/06/25) Wheel burrow</td><td className="sub-amount-col">20.00</td><td className="amount-col"></td></tr>
                <tr><td className="sub-item">(25/06/25) Refuse</td><td className="sub-amount-col">50.00</td><td className="amount-col"><strong>387.50</strong></td></tr>
                <tr><td className="font-semibold">Teacher's Motivation</td><td className="amount-col"></td><td className="amount-col"></td></tr>
                <tr><td className="sub-item">(13/06/25)</td><td className="sub-amount-col">242.00</td><td className="amount-col"></td></tr>
                <tr><td className="sub-item">(20/06/25)</td><td className="sub-amount-col">492.00</td><td className="amount-col"></td></tr>
                <tr><td className="sub-item">(27/06/25)</td><td className="sub-amount-col">450.00</td><td className="amount-col"><strong>1,184.00</strong></td></tr>
                <tr><td>Bus Fuel</td><td className="amount-col"></td><td className="amount-col">1,980.00</td></tr>
                <tr><td>Bus Maintenance</td><td className="amount-col"></td><td className="amount-col">5,807.00</td></tr>
                <tr><td>Water Bill / Water Supply</td><td className="amount-col">-</td><td className="amount-col"></td></tr>
                <tr><td>Tel. Charges</td><td className="amount-col">-</td><td className="amount-col"></td></tr>
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
