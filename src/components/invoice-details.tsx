
'use client'

import React from 'react';
import type { Invoice } from '@/types';
import { Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { useSchoolInfo } from '@/context/school-info-context';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface InvoiceDetailsProps {
    invoice: Invoice;
}

export function InvoiceDetails({ invoice }: InvoiceDetailsProps) {
  const { schoolInfo } = useSchoolInfo();

  if (!invoice || !schoolInfo) {
    return <div>Loading...</div>;
  }

  const handlePrint = () => {
    window.print();
  }

  const generateInvoiceNumber = (invoice: Invoice) => {
    if (invoice.admissionId && /^\d{2}-T\d-\d{4}$/.test(invoice.admissionId)) {
        return invoice.admissionId;
    }
    const date = new Date(invoice.dueDate || new Date());
    const year = format(date, 'yy');
    const month = date.getMonth();
    let term = 'T1';
    if (month > 3 && month < 8) term = 'T2';
    if (month >= 8) term = 'T3';
    let hash = 0;
    for (let i = 0; i < invoice.id.length; i++) {
        hash = (hash << 5) - hash + invoice.id.charCodeAt(i);
        hash |= 0;
    }
    const sequence = Math.abs(hash).toString().substring(0, 4).padStart(4, '0');
    return `${year}-${term}-${sequence}`;
  }

  const invoiceNumber = generateInvoiceNumber(invoice);
  
  const paymentTermsText = schoolInfo.paymentTerms?.replace(/{{dueDate}}/g, format(new Date(invoice.dueDate || new Date()), 'dd MMM, yyyy')) || '';
  const paymentMethodsHtml = schoolInfo.paymentMethods?.replace(/{{invoiceNumber}}/g, `<strong>${invoiceNumber}</strong>`).replace(/\n/g, '<br />') || '';

  const handleExport = () => {
    const input = document.getElementById('printable-invoice');
    if (input) {
      html2canvas(input, { scale: 2 }) // Increase scale for better resolution
        .then((canvas) => {
          const imgData = canvas.toDataURL('image/png');
          // A5 dimensions in mm: 148 x 210
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a5'
          });
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;
          const canvasAspectRatio = canvasWidth / canvasHeight;
          const pdfAspectRatio = pdfWidth / pdfHeight;

          let finalCanvasWidth, finalCanvasHeight;

          if (canvasAspectRatio > pdfAspectRatio) {
            finalCanvasWidth = pdfWidth;
            finalCanvasHeight = pdfWidth / canvasAspectRatio;
          } else {
            finalCanvasHeight = pdfHeight;
            finalCanvasWidth = pdfHeight * canvasAspectRatio;
          }
          
          const x = (pdfWidth - finalCanvasWidth) / 2;
          const y = 0; // Align to top

          pdf.addImage(imgData, 'PNG', x, y, finalCanvasWidth, finalCanvasHeight);
          pdf.save(`invoice-${invoiceNumber}.pdf`);
        });
    }
  }

  return (
    <div className="p-1 pt-4">
      <div id="printable-invoice" className="printable-area invoice-container bg-white">
        <header className="invoice-header">
            <div className="school-info">
                {schoolInfo.logoUrl && <img src={schoolInfo.logoUrl} alt="School Logo" className="logo" />}
                <div className="school-address">
                    <strong>{schoolInfo.schoolName}</strong><br />
                    {schoolInfo.address}<br />
                    {schoolInfo.phone}
                </div>
            </div>
            <div className="invoice-title">
                <h1>INVOICE</h1>
            </div>
        </header>

        <section className="invoice-meta">
            <div className="bill-to">
                <h3>BILL TO</h3>
                <p>
                    {invoice.studentName}<br />
                    {invoice.studentClass}<br />
                    ID: {invoice.admissionId}
                </p>
            </div>
            <div className="invoice-dates">
                <table>
                    <tbody>
                        <tr><th>Invoice #</th><td>{invoiceNumber}</td></tr>
                        <tr><th>Issue Date</th><td>{format(new Date(), 'dd MMM, yyyy')}</td></tr>
                        <tr><th>Due Date</th><td>{format(new Date(invoice.dueDate || new Date()), 'dd MMM, yyyy')}</td></tr>
                    </tbody>
                </table>
            </div>
        </section>

        <section className="invoice-body">
            <div className="watermark" style={{ top: '55%', left: '50%', transform: 'translate(-50%, -50%)' }}>
              {schoolInfo.logoUrl && <img src={schoolInfo.logoUrl} alt="Watermark" />}
            </div>
            <table className="items-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th className="text-right">Amount (GHS)</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.items?.map((item, index) => (
                        <tr key={index}>
                            <td>{item.name}</td>
                            <td className="text-right">{item.amount.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>

        <section className="invoice-summary">
            <table className="totals-table">
                <tbody>
                    <tr><th>Sub Total</th><td className="text-right">{invoice.totalAmount?.toFixed(2)}</td></tr>
                    <tr><th>Amount Paid</th><td className="text-right">({invoice.amountPaid.toFixed(2)})</td></tr>
                    <tr className="balance-due"><th>Balance Due</th><td className="text-right">GHS {invoice.amount.toFixed(2)}</td></tr>
                </tbody>
            </table>
        </section>

        <footer className="invoice-footer">
            <div className="payment-terms">
                <h3>PAYMENT TERMS</h3>
                <p style={{whiteSpace: 'pre-line'}}>{paymentTermsText}</p>
            </div>
            <div className="payment-methods">
                <h3>PAYMENT METHODS</h3>
                <div dangerouslySetInnerHTML={{ __html: paymentMethodsHtml}} />
            </div>
        </footer>
         <div className="invoice-final-footer">
          <p>Powered by <strong>CompusFlow</strong></p>
          <p>“Where code, connectivity & commerce flow together.”</p>
          <p>- {schoolInfo.phone} -</p>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2 no-print">
            <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
            </Button>
            <Button onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export as PDF
            </Button>
      </div>
    </div>
  );
}
