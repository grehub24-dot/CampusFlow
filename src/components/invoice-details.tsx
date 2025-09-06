
'use client'

import React from 'react';
import type { Invoice } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Printer, Download, Banknote } from 'lucide-react';
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
    
    if (num === 0) return 'Zero';

    const [integerPart, decimalPart] = num.toFixed(2).split('.').map(Number);

    let words = '';

    const toWords = (n: number) => {
        if (n < 20) {
            return a[n] || '';
        }
        let digit = n % 10;
        return (b[Math.floor(n/10)] || '') + (a[digit] || '');
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
    <div className="p-1 pt-4 printable-area font-sans bg-gray-50">
      <div className="w-[210mm] mx-auto p-8 bg-white text-gray-800 shadow-lg">
        <header className="flex justify-between items-center pb-8 border-b-2 border-primary">
            <div>
                <Image src={schoolInfo.logoUrl || "https://picsum.photos/120/50"} width={120} height={50} alt="School Logo" data-ai-hint="logo" className="object-contain" />
            </div>
            <div className="text-right">
                <h1 className="text-3xl font-bold text-primary">INVOICE</h1>
                <p className="text-gray-500">Invoice #: {invoice.id}</p>
            </div>
        </header>

        <section className="grid grid-cols-2 gap-8 my-8">
            <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Billed To</h3>
                <p className="font-bold text-lg">{invoice.studentName}</p>
                <p>{invoice.studentClass}</p>
                <p>Guardian: {invoice.amountPaid}</p>
            </div>
            <div className="text-right">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Details</h3>
                <p><span className="font-semibold">Date of Issue:</span> {format(new Date(), 'dd MMM, yyyy')}</p>
                <p><span className="font-semibold">Due Date:</span> {format(new Date(invoice.dueDate || new Date()), 'dd MMM, yyyy')}</p>
            </div>
        </section>

        <section>
            <table className="w-full text-left">
                <thead className="bg-primary text-white">
                    <tr>
                        <th className="p-3 font-semibold">Description</th>
                        <th className="p-3 text-center font-semibold">Qty</th>
                        <th className="p-3 text-right font-semibold">Unit Price (GHS)</th>
                        <th className="p-3 text-right font-semibold">Amount (GHS)</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.items?.map((item, index) => (
                         <tr key={index} className="border-b">
                            <td className="p-3">{item.name}</td>
                            <td className="p-3 text-center">1</td>
                            <td className="p-3 text-right">{item.amount.toFixed(2)}</td>
                            <td className="p-3 text-right">{item.amount.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>

        <section className="flex justify-end mt-8">
            <div className="w-full max-w-sm space-y-2 text-gray-600">
                 <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{invoice.totalAmount?.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between">
                    <span>Discount</span>
                    <span>(0.00)</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-primary font-bold text-2xl">
                    <span>Total Due</span>
                    <span>GHS {invoice.amount.toFixed(2)}</span>
                </div>
            </div>
        </section>
        
        <Separator className="my-8" />
        
        <section className="grid grid-cols-2 gap-8">
             <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment Terms</h3>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Payment is due by {format(new Date(invoice.dueDate || new Date()), 'dd MMM, yyyy')}.</li>
                    <li>Late fee of 2% per month may apply after the due date.</li>
                    <li>Please quote the invoice number when making payments.</li>
                </ul>
             </div>
             <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment Methods</h3>
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                           <Banknote className="h-8 w-8 text-primary" />
                            <div>
                                <p className="font-bold text-primary">Mobile Money</p>
                                <p className="text-sm text-gray-600">Dial <span className="font-mono font-semibold">*800*0*6491#</span> and use <span className="font-mono font-semibold">{invoice.id}</span> as reference.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
             </div>
        </section>

        <footer className="text-center mt-12 pt-8 border-t">
            <h3 className="font-bold text-lg">{schoolInfo.schoolName}</h3>
            <p className="text-sm text-gray-500">{schoolInfo.address} • {schoolInfo.phone}</p>
            <p className="text-sm font-semibold text-primary mt-2">Thank you for your partnership!</p>
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
