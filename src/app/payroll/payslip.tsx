
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
    window.print();
  }

  const customDeductionsTotal = (payslip.deductions || []).reduce((acc, d) => acc + d.amount, 0);
  const arrearsTotal = (payslip.arrears || []).reduce((acc, a) => acc + a.amount, 0);
  const totalEarnings = payslip.grossSalary + arrearsTotal;
  const totalDeductions = payslip.ssnitEmployee + payslip.incomeTax + customDeductionsTotal;

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return (
    <div className="p-4">
      <div id="payslip-printable" className="printable-area payslip-container bg-white text-black p-6 font-sans">
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

        <section className="grid grid-cols-2 gap-8">
            <div>
                <h4 className="font-semibold text-base mb-2 underline">Earnings</h4>
                <div className="flex justify-between py-1.5">
                    <span>Gross Salary</span>
                    <span>GHS {formatCurrency(payslip.grossSalary)}</span>
                </div>
                {(payslip.arrears || []).map((arrear, index) => (
                    <div key={index} className="flex justify-between py-1.5">
                        <span>{arrear.name}</span>
                        <span>GHS {formatCurrency(arrear.amount)}</span>
                    </div>
                ))}
                 <div className="flex justify-between py-1.5 border-t mt-2 pt-2 font-bold">
                    <span>Total Earnings</span>
                    <span>GHS {formatCurrency(totalEarnings)}</span>
                </div>
            </div>
            
            <div>
                <h4 className="font-semibold text-base mb-2 underline">Deductions</h4>
                 <div className="flex justify-between py-1.5">
                    <span>Employee SSNIT (5.5%)</span>
                    <span>GHS {formatCurrency(payslip.ssnitEmployee)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                    <span>Income Tax (PAYE)</span>
                    <span>GHS {formatCurrency(payslip.incomeTax)}</span>
                </div>
                 {(payslip.deductions || []).map((deduction, index) => (
                    <div key={index} className="flex justify-between py-1.5">
                        <span>{deduction.name}</span>
                        <span>GHS {formatCurrency(deduction.amount)}</span>
                    </div>
                ))}
                 <div className="flex justify-between py-1.5 border-t mt-2 pt-2 font-bold">
                    <span>Total Deductions</span>
                    <span>GHS {formatCurrency(totalDeductions)}</span>
                </div>
            </div>
        </section>
        
        <section className="mt-8 text-right">
            <div className="text-xl font-bold inline-flex gap-4 p-2 bg-gray-100 rounded">
              <span>Net Salary:</span>
              <span>GHS {formatCurrency(payslip.netSalary)}</span>
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
