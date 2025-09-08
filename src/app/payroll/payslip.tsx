
'use client'

import React from 'react';
import type { Payslip } from '@/types';
import { useSchoolInfo } from '@/context/school-info-context';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

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
      const printWindow = window.open('', '', 'height=600,width=800');
      printWindow?.document.write('<html><head><title>Payslip</title>');
      printWindow?.document.write('<style>body { font-family: sans-serif; } .payslip-container { max-width: 700px; margin: auto; padding: 2rem; border: 1px solid #ccc; } .no-print { display: none; } </style>');
      printWindow?.document.write('</head><body>');
      printWindow?.document.write(printableArea.innerHTML);
      printWindow?.document.write('</body></html>');
      printWindow?.document.close();
      printWindow?.print();
    }
  }

  const customDeductionsTotal = payslip.deductions?.reduce((acc, d) => acc + d.amount, 0) || 0;
  const totalDeductions = payslip.ssnitEmployee + payslip.incomeTax + customDeductionsTotal;

  return (
    <div className="p-4">
      <div id="payslip-printable" className="payslip-container">
        <header className="text-center mb-6">
            <h2 className="text-2xl font-bold">{schoolInfo.schoolName}</h2>
            <p className="text-muted-foreground">{schoolInfo.address}</p>
            <h3 className="text-xl font-semibold mt-4">Payslip for {payslip.period}</h3>
        </header>
        
        <section className="grid grid-cols-2 gap-4 mb-6 border-y py-4">
            <div><strong>Employee:</strong> {payslip.staffName}</div>
            <div className="text-right"><strong>Pay Date:</strong> {format(new Date(), 'PPP')}</div>
        </section>

        <section className="grid grid-cols-2 gap-8">
            <div>
                <h4 className="font-semibold text-lg mb-2">Earnings</h4>
                <div className="flex justify-between py-2 border-b">
                    <span>Gross Salary</span>
                    <span>GHS {payslip.grossSalary.toFixed(2)}</span>
                </div>
            </div>
            <div>
                <h4 className="font-semibold text-lg mb-2">Deductions</h4>
                 <div className="flex justify-between py-2 border-b">
                    <span>Employee SSNIT (5.5%)</span>
                    <span>GHS {payslip.ssnitEmployee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                    <span>Income Tax (PAYE)</span>
                    <span>GHS {payslip.incomeTax.toFixed(2)}</span>
                </div>
                 {payslip.deductions.map((deduction, index) => (
                    <div key={index} className="flex justify-between py-2 border-b">
                        <span>{deduction.name}</span>
                        <span>GHS {deduction.amount.toFixed(2)}</span>
                    </div>
                ))}
                 <div className="flex justify-between py-2 font-bold">
                    <span>Total Deductions</span>
                    <span>GHS {totalDeductions.toFixed(2)}</span>
                </div>
            </div>
        </section>
        
        <section className="mt-8 text-right">
            <div className="text-2xl font-bold">
              <span>Net Salary: </span>
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
