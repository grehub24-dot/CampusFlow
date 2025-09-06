
'use client'

import React from 'react';
import type { Invoice } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { useSchoolInfo } from '@/context/school-info-context';
import Image from 'next/image';

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

  // A simple (and limited) function to convert number to words for the invoice.
  const numberToWords = (num: number) => {
    const a = ['','one ','two ','three ','four ', 'five ','six ','seven ','eight ','nine ','ten ','eleven ','twelve ','thirteen ','fourteen ','fifteen ','sixteen ','seventeen ','eighteen ','nineteen '];
    const b = ['', '', 'twenty','thirty','forty','fifty', 'sixty','seventy','eighty','ninety'];
    
    const [integerPart, decimalPart] = num.toFixed(2).split('.').map(Number);

    let words = '';

    const toWords = (n: number) => {
        if (n < 20) {
            return a[n];
        }
        let digit = n % 10;
        return b[Math.floor(n/10)] + a[digit];
    }
    
    if (integerPart === 0) {
        words = 'zero';
    } else {
       if (integerPart >= 1000) {
           words += toWords(Math.floor(integerPart / 1000)) + 'thousand ';
       }
       if (integerPart % 1000 >= 100) {
           words += toWords(Math.floor((integerPart % 1000) / 100)) + 'hundred ';
       }
       if (integerPart % 100 > 0) {
           words += toWords(integerPart % 100);
       }
    }
    
    words = words.trim() + ' Ghana cedis';

    if (decimalPart > 0) {
        words += ' and ' + toWords(decimalPart) + 'pesewas';
    }

    return words.charAt(0).toUpperCase() + words.slice(1) + '.';
  };

  return (
    <div className="p-1 pt-4 printable-area font-sans">
      <div className="w-[210mm] mx-auto p-6 bg-white text-black">
        <header className="text-center mb-6">
            <h1 className="text-2xl font-bold">{schoolInfo.schoolName}</h1>
            <p className="text-sm">{schoolInfo.address}</p>
            <p className="text-sm">{schoolInfo.phone}</p>
        </header>

        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold underline">SCHOOL FEES PAYMENT CHIT</h2>
            <p className="text-xs">(Student Copy – Keep for your records)</p>
        </div>

        <div className="flex justify-between text-sm mb-4">
            <span><strong>Invoice #:</strong> {invoice.id}</span>
            <span><strong>Date:</strong> {format(new Date(), 'dd MMM yyyy')}</span>
        </div>

        <div className="border-t border-b border-gray-300 py-2 text-sm mb-4">
            <p><strong>Student:</strong> {invoice.studentName} &emsp; <strong>Class:</strong> {invoice.studentClass}</p>
            <p><strong>Guardian:</strong> {invoice.amountPaid} &emsp; </p>
        </div>

        <table className="w-full text-sm mb-4">
            <thead className="border-b-2 border-black">
                <tr>
                    <th className="p-1 text-left font-bold">Description</th>
                    <th className="p-1 text-center font-bold">Qty</th>
                    <th className="p-1 text-right font-bold">Unit (GHS)</th>
                    <th className="p-1 text-right font-bold">Amount (GHS)</th>
                </tr>
            </thead>
            <tbody>
                {invoice.items?.map((item, index) => (
                     <tr key={index}>
                        <td className="p-1">{item.name}</td>
                        <td className="p-1 text-center">1</td>
                        <td className="p-1 text-right">{item.amount.toFixed(2)}</td>
                        <td className="p-1 text-right">{item.amount.toFixed(2)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
        
        <div className="flex justify-end mb-4 text-sm">
            <div className="w-64">
                <div className="flex justify-between">
                    <span>Sub-total</span>
                    <span>{invoice.totalAmount?.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between font-bold border-t border-b-2 border-black my-1 py-1">
                    <span>TOTAL DUE</span>
                    <span>{invoice.amount.toFixed(2)}</span>
                </div>
            </div>
        </div>

        <div className="text-xs font-semibold mb-6">
            <p>Amount in words: {numberToWords(invoice.amount)}</p>
        </div>

        <div className="text-xs border-t pt-4">
            <h4 className="font-bold mb-1">Payment Terms:</h4>
            <ul className="list-disc list-inside mb-4">
                <li>Payable on or before {format(new Date(invoice.dueDate || new Date()), 'dd MMM yyyy')}.</li>
                <li>Late fee of 2% per month applies after due date.</li>
            </ul>
             <h4 className="font-bold mb-1">Pay via Mobile Money (no charges):</h4>
             <ul className="list-disc list-inside">
                <li>Dial *800*0*6491# on any network</li>
                <li>Enter amount: {invoice.amount.toFixed(2)}</li>
                <li>Enter reference: {invoice.id}</li>
                <li>Approve prompt on your phone</li>
                <li>Cash / Cheque also accepted at the bursary.</li>
             </ul>
        </div>
        
        <footer className="text-center mt-6 text-xs">
            <p>Powered by Redde • www.redde.com.gh</p>
            <p className="font-bold">Thank you for choosing {schoolInfo.schoolName}!</p>
        </footer>
      </div>

       <div className="mt-6 flex justify-end gap-2 no-print">
            <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
            </Button>
            <Button onClick={handlePrint}>
                <Download className="mr-2 h-4 w-4" />
                Export as PDF
            </Button>
        </div>
    </div>
  );
}
