
'use client'

import React from 'react';
import type { Payslip } from '@/types';
import { useSchoolInfo } from '@/context/school-info-context';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

interface PayslipDetailsProps {
    payslip: Payslip;
}

const DetailRow = ({ label, value, isBold = false, isTotal=false }: { label: string, value: string | number, isBold?: boolean, isTotal?: boolean }) => (
    <div className={`flex justify-between py-1 ${isBold ? 'font-bold' : ''}`}>
        <span>{label}</span>
        <span>{isTotal ? 'GHS ' : ''}{typeof value === 'number' ? `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value}</span>
    </div>
);


export function PayslipDetails({ payslip }: PayslipDetailsProps) {
  const { schoolInfo } = useSchoolInfo();

  if (!payslip || !schoolInfo) {
    return <div>Loading...</div>;
  }
  
  const handlePrint = () => {
    const printableArea = document.getElementById('payslip-printable');
    if (printableArea) {
      const printWindow = window.open('', '', 'height=800,width=600');
      printWindow?.document.write('<html><head><title>Payslip</title>');
      
      const tailwindStyles = Array.from(document.styleSheets).find(s => s.href?.includes('tailwind'))?.ownerNode as HTMLLinkElement | undefined;
      const appStyles = Array.from(document.styleSheets).find(s => !s.href)?.ownerNode as HTMLStyleElement | undefined;

      if(tailwindStyles) printWindow?.document.write(tailwindStyles.outerHTML);
      if(appStyles) printWindow?.document.write(`<style>${appStyles.innerHTML}</style>`);
      
      printWindow?.document.write(`
        <style>
          body { -webkit-print-color-adjust: exact; }
          .payslip-container { max-width: 500px; margin: auto; padding: 20px; }
          .no-print { display: none; }
        </style>
      `);

      printWindow?.document.write('</head><body onload="window.print(); window.close();">');
      printWindow?.document.write(printableArea.innerHTML);
      printWindow?.document.write('</body></html>');
      printWindow?.document.close();
    }
  }

  const customDeductionsTotal = payslip.deductions?.reduce((acc, d) => acc + d.amount, 0) || 0;
  const totalDeductions = payslip.ssnitEmployee + payslip.incomeTax + customDeductionsTotal;

  return (
    <div className="p-4">
      <div id="payslip-printable" className="payslip-container text-sm bg-white">
        <header className="header text-center mb-4">
            <h2 className="school-name text-2xl font-bold">{schoolInfo.schoolName}</h2>
            <p>{schoolInfo.address}</p>
            {schoolInfo.logoUrl && (
                <div className="flex justify-center my-2">
                    <Image
                        src={schoolInfo.logoUrl}
                        alt="School Logo"
                        width={60}
                        height={60}
                        className="rounded-md object-contain"
                    />
                </div>
            )}
            <p className="font-semibold text-lg mt-2">Payslip for {payslip.period}</p>
        </header>
        
        <Separator className="my-2 bg-black" />

        <section className="details-grid flex justify-between mb-4">
            <div><strong>Employee:</strong> {payslip.staffName}</div>
            <div><strong>Pay Date:</strong> {format(new Date(), 'PPP')}</div>
        </section>

        <section className="section">
            <h3 className="section-title font-bold mb-1">Earnings</h3>
             <Separator className="my-1 bg-black" />
            <DetailRow label="Gross Salary" value={`GHS ${payslip.grossSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        </section>

        <section className="section mt-4">
            <h3 className="section-title font-bold mb-1">Deductions</h3>
            <Separator className="my-1 bg-black" />
            <DetailRow label="Employee SSNIT (5.5%)" value={`GHS ${payslip.ssnitEmployee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            <DetailRow label="Income Tax (PAYE)" value={`GHS ${payslip.incomeTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            {payslip.deductions?.map((deduction, index) => (
              <DetailRow key={index} label={deduction.name} value={`GHS ${deduction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            ))}
            <Separator className="my-2 bg-black" />
            <DetailRow 
                label="Total Deductions" 
                value={totalDeductions}
                isBold
                isTotal
            />
        </section>
        
        <section className="section mt-4">
            <Separator className="my-2 bg-black" />
            <DetailRow label="Net Salary" value={payslip.netSalary} isBold isTotal />
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
