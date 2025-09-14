
'use client'

import React from 'react';
import type { Payslip } from '@/types';
import { useSchoolInfo } from '@/context/school-info-context';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import Image from 'next/image';

interface PayslipDetailsProps {
    payslip: Payslip;
}

export function PayslipDetails({ payslip }: PayslipDetailsProps) {
  const { schoolInfo } = useSchoolInfo();

  if (!payslip || !schoolInfo) {
    return <div>Loading...</div>;
  }
  
  const handlePrint = () => {
    const printableArea = document.getElementById('payslip-printable');
    if (printableArea) {
      const printWindow = window.open('', '', 'height=800,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Payslip</title>');
        // Inject styles for printing
        const styles = Array.from(document.styleSheets)
            .map(styleSheet => {
                try {
                    return Array.from(styleSheet.cssRules)
                        .map(rule => rule.cssText)
                        .join('');
                } catch (e) {
                    console.warn('Could not read cross-origin stylesheet:', e);
                    return '';
                }
            })
            .filter(Boolean)
            .join('\n');
        
        printWindow.document.write(`<style>${styles}</style>`);
        printWindow.document.write('<style>.no-print { display: none; } body { -webkit-print-color-adjust: exact; } </style>');

        printWindow.document.write('</head><body>');
        printWindow.document.write(printableArea.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }
    }
  }

  const customDeductionsTotal = payslip.deductions?.reduce((acc, d) => acc + d.amount, 0) || 0;
  const arrearsTotal = payslip.arrears?.reduce((acc, a) => acc + a.amount, 0) || 0;
  const totalEarnings = payslip.grossSalary + arrearsTotal;
  const totalDeductions = payslip.ssnitEmployee + payslip.incomeTax + customDeductionsTotal;

  return (
    <div className="p-4">
      <div id="payslip-printable" className="payslip-container bg-white text-black p-6 font-sans">
        <header className="text-center mb-6 border-b-2 pb-4">
             <div className="flex justify-center items-center gap-4">
                <Image src={schoolInfo.logoUrl || "/logo.jpg"} width={60} height={60} alt="School Logo" className="object-contain" data-ai-hint="logo" />
                <div>
                    <h2 className="text-2xl font-bold">{schoolInfo.schoolName}</h2>
                    <p className="text-sm">{schoolInfo.address}</p>
                    <h3 className="text-lg font-semibold mt-2">Payslip for {payslip.period}</h3>
                </div>
                <Image src={schoolInfo.logoUrl || "/logo.jpg"} width={60} height={60} alt="School Logo" className="object-contain" data-ai-hint="logo" />
            </div>
        </header>
        
        <section className="flex justify-between items-center mb-6 text-sm">
            <div><strong>Employee:</strong> {payslip.staffName}</div>
            <div><strong>Pay Date:</strong> {format(new Date(), 'PPP')}</div>
        </section>

        <section className="space-y-4">
            <div>
                <h4 className="font-semibold text-base mb-2 underline">Earnings</h4>
                <div className="flex justify-between py-1.5">
                    <span>Gross Salary</span>
                    <span>GHS {payslip.grossSalary.toFixed(2)}</span>
                </div>
                {payslip.arrears.map((arrear, index) => (
                    <div key={index} className="flex justify-between py-1.5">
                        <span>{arrear.name}</span>
                        <span>GHS {arrear.amount.toFixed(2)}</span>
                    </div>
                ))}
            </div>
            
            <div className="flex justify-between py-1.5 border-t border-b font-bold">
                <span>Total Earnings</span>
                <span>GHS {totalEarnings.toFixed(2)}</span>
            </div>

            <div>
                <h4 className="font-semibold text-base mb-2 underline">Deductions</h4>
                 <div className="flex justify-between py-1.5">
                    <span>Employee SSNIT (5.5%)</span>
                    <span>GHS {payslip.ssnitEmployee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                    <span>Income Tax (PAYE)</span>
                    <span>GHS {payslip.incomeTax.toFixed(2)}</span>
                </div>
                 {payslip.deductions.map((deduction, index) => (
                    <div key={index} className="flex justify-between py-1.5">
                        <span>{deduction.name}</span>
                        <span>GHS {deduction.amount.toFixed(2)}</span>
                    </div>
                ))}
            </div>

            <div className="flex justify-between py-1.5 border-t border-b font-bold">
                <span>Total Deductions</span>
                <span>GHS {totalDeductions.toFixed(2)}</span>
            </div>
        </section>
        
        <section className="mt-6 text-right">
            <div className="text-xl font-bold inline-flex gap-4 p-2 bg-gray-100 rounded">
              <span>Net Salary:</span>
              <span>GHS {payslip.netSalary.toFixed(2)}</span>
            </div>
        </section>
      </div>

       <div className="mt-6 flex justify-end gap-2 no-print">
            <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
            </Button>
      </div>

    </div>
  );
}
