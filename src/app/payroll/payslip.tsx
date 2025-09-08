
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

const DetailRow = ({ label, value, isBold = false }: { label: string, value: string | number, isBold?: boolean }) => (
    <div className={`flex justify-between py-2 ${isBold ? 'font-bold' : ''}`}>
        <span>{label}</span>
        <span>GHS {typeof value === 'number' ? `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value}</span>
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
      
      const appStyles = Array.from(document.styleSheets).find(s => s.href?.includes('globals.css'));
      if(appStyles?.href) {
        printWindow?.document.write(`<link rel="stylesheet" href="${appStyles.href}">`);
      }
      
      printWindow?.document.write(`
        <style>
          body { -webkit-print-color-adjust: exact; font-family: sans-serif; }
          .payslip-container { max-width: 500px; margin: 20px auto; padding: 0; color: #000; }
          .no-print { display: none; }
          .header { text-align: center; margin-bottom: 1rem; }
          .school-name { font-size: 1.5rem; font-weight: bold; }
          .payslip-title { font-weight: 600; font-size: 1.125rem; margin-top: 0.5rem; }
          .details-grid { display: flex; justify-content: space-between; padding: 0.5rem 0; border-top: 1px solid #000; border-bottom: 1px solid #000; }
          .section-title { font-weight: bold; padding: 0.5rem 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee; }
          .separator { border-top: 1px solid #000; margin: 0.5rem 0; }
          .bold-row { font-weight: bold; }
        </style>
      `);
      
      printWindow?.document.write('</head><body style="color: black;">');
      printWindow?.document.write('<div class="payslip-container">');
      printWindow?.document.write(printableArea.innerHTML);
      printWindow?.document.write('</div>');
      
      printWindow?.document.write(`
        <script>
            setTimeout(() => { 
                window.print(); 
                window.close(); 
            }, 500);
        </script>
      `);

      printWindow?.document.write('</body></html>');
      printWindow?.document.close();
    }
  }

  const customDeductionsTotal = payslip.deductions?.reduce((acc, d) => acc + d.amount, 0) || 0;
  const totalDeductions = payslip.ssnitEmployee + payslip.incomeTax + customDeductionsTotal;

  return (
    <div className="p-4">
      <div id="payslip-printable" className="payslip-container text-sm bg-white text-black">
        <header className="header text-center mb-4">
             <div className="flex justify-center items-center gap-4">
                {schoolInfo.logoUrl && (
                    <Image
                        src={schoolInfo.logoUrl}
                        alt="School Logo"
                        width={60}
                        height={60}
                        className="object-contain"
                    />
                )}
                <h2 className="school-name text-2xl font-bold">{schoolInfo.schoolName}</h2>
                 {schoolInfo.logoUrl && (
                    <Image
                        src={schoolInfo.logoUrl}
                        alt="School Logo"
                        width={60}
                        height={60}
                        className="object-contain"
                    />
                )}
            </div>
            <p>{schoolInfo.address}</p>
            <p className="payslip-title font-semibold text-lg mt-2">Payslip for {payslip.period}</p>
        </header>
        
        <div className="details-grid flex justify-between py-2 border-t border-b border-black">
            <div><strong>Employee:</strong> {payslip.staffName}</div>
            <div><strong>Pay Date:</strong> {format(new Date(), 'PPP')}</div>
        </div>

        <section className="mt-4">
            <h3 className="section-title font-bold py-2">Earnings</h3>
            <div className="detail-row flex justify-between py-2 border-b border-gray-200">
                <span>Gross Salary</span>
                <span>GHS {payslip.grossSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
        </section>

        <section className="mt-4">
            <h3 className="section-title font-bold py-2">Deductions</h3>
            <div className="detail-row flex justify-between py-2 border-b border-gray-200">
                <span>Employee SSNIT (5.5%)</span>
                <span>GHS {payslip.ssnitEmployee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
             <div className="detail-row flex justify-between py-2 border-b border-gray-200">
                <span>Income Tax (PAYE)</span>
                <span>GHS {payslip.incomeTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {payslip.deductions?.map((deduction, index) => (
              <div key={index} className="detail-row flex justify-between py-2 border-b border-gray-200">
                <span>{deduction.name}</span>
                <span>GHS {deduction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ))}
             <div className="separator border-t border-black my-2"></div>
             <div className="detail-row flex justify-between py-2 font-bold">
                <span>Total Deductions</span>
                <span>GHS {totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
        </section>
        
        <section className="mt-4">
             <div className="separator border-t border-black my-2"></div>
            <div className="detail-row flex justify-between py-2 font-bold text-lg">
              <span>Net Salary</span>
              <span>GHS {payslip.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
