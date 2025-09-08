
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

const DetailRow = ({ label, value, isBold = false }: { label: string, value: string | number, isBold?: boolean }) => (
    <div className={`flex justify-between py-2 ${isBold ? 'font-bold' : ''}`}>
        <span>{label}</span>
        <span>{typeof value === 'number' ? `GHS ${value.toLocaleString()}` : value}</span>
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
      const printWindow = window.open('', '', 'height=600,width=800');
      printWindow?.document.write('<html><head><title>Payslip</title>');
      // A very basic styling for printing
      printWindow?.document.write(`
        <style>
          body { font-family: sans-serif; }
          .payslip-container { max-width: 800px; margin: auto; padding: 20px; }
          .header { text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .section { margin-top: 20px; }
          .section h3 { border-bottom: 1px solid #eee; padding-bottom: 5px; }
          .flex-between { display: flex; justify-content: space-between; padding: 5px 0; }
          .bold { font-weight: bold; }
        </style>
      `);
      printWindow?.document.write('</head><body>');
      printWindow?.document.write(printableArea.innerHTML);
      printWindow?.document.write('</body></html>');
      printWindow?.document.close();
      printWindow?.print();
    }
  }

  return (
    <div className="p-4">
      <div id="payslip-printable" className="payslip-container text-sm">
        <header className="header">
            <h2 className="text-2xl font-bold">{schoolInfo.schoolName}</h2>
            <p>{schoolInfo.address}</p>
            <p>Payslip for {payslip.period}</p>
        </header>

        <section className="details-grid">
            <div><strong>Employee:</strong> {payslip.staffName}</div>
            <div><strong>Pay Date:</strong> {format(new Date(), 'PPP')}</div>
        </section>

        <section className="section">
            <h3 className="font-bold text-lg mb-2">Earnings</h3>
            <DetailRow label="Gross Salary" value={payslip.grossSalary} />
        </section>

        <section className="section">
            <h3 className="font-bold text-lg mb-2">Deductions</h3>
            <DetailRow label="Employee SSNIT (5.5%)" value={payslip.ssnitEmployee} />
            <DetailRow label="Income Tax (PAYE)" value={payslip.incomeTax} />
            <DetailRow 
                label="Total Deductions" 
                value={(payslip.ssnitEmployee + payslip.incomeTax).toFixed(2)} 
                isBold 
            />
        </section>
        
        <section className="section mt-6 border-t-2 border-black pt-4">
            <DetailRow label="Net Salary" value={payslip.netSalary} isBold />
        </section>
      </div>

       <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
            </Button>
      </div>

    </div>
  );
}
