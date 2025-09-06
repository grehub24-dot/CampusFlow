
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';


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
    // Fallback for older IDs: Generate a display ID based on due date
    const date = new Date(invoice.dueDate || new Date());
    const year = format(date, 'yy');
    // Simplified term logic for display purposes
    const month = date.getMonth();
    let term = 'T1';
    if (month > 3 && month < 8) term = 'T2';
    if (month >= 8) term = 'T3';

    // Create a simple numeric hash from the student ID for consistency
    let hash = 0;
    for (let i = 0; i < invoice.id.length; i++) {
        hash = (hash << 5) - hash + invoice.id.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    const sequence = Math.abs(hash).toString().substring(0, 4).padStart(4, '0');


    return `${year}-${term}-${sequence}`;
  }
  
  const invoiceNumber = generateInvoiceNumber(invoice);

  const paymentTerms = schoolInfo.paymentTerms?.replace('{{dueDate}}', `<strong>${format(new Date(invoice.dueDate || new Date()), 'dd MMM, yyyy')}</strong>`) || '';
  const paymentMethods = schoolInfo.paymentMethods?.replace('{{invoiceNumber}}', `<strong>${invoiceNumber}</strong>`) || '';


  return (
    <div className="p-1 pt-4">
       <div className="printable-area relative w-full mx-auto p-4 bg-white text-gray-800">
        
        <div className="absolute inset-0 flex items-center justify-center z-0 opacity-5 pointer-events-none">
          <Image src={schoolInfo.logoUrl || "https://picsum.photos/400/400"} width={400} height={400} alt="School Logo Watermark" className="object-contain" />
        </div>

        <div className="relative z-10">
            <header className="flex justify-between items-center pb-8 border-b-2 border-primary">
                <div className="flex items-center gap-4">
                  <Image src={schoolInfo.logoUrl || "https://picsum.photos/120/50"} width={80} height={80} alt="School Logo" data-ai-hint="logo" className="object-contain" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-primary">{schoolInfo.schoolName}</h2>
                    <p className="text-xs text-gray-500">{schoolInfo.address}</p>
                    <p className="text-xs text-gray-500">{schoolInfo.phone}</p>
                </div>
                <div className="text-right">
                    <h1 className="text-2xl font-bold text-gray-700">INVOICE</h1>
                    <p className="text-gray-500 mt-1">{invoiceNumber}</p>
                </div>
            </header>


            <section className="grid grid-cols-2 gap-8 my-8">
                <div>
                    <Card className="rounded-lg shadow-none border-0 bg-gray-50 p-4">
                        <CardHeader className="pb-2 px-0 pt-0">
                            <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Billed To</CardTitle>
                        </CardHeader>
                        <CardContent className="px-0 pb-0">
                            <p className="font-bold text-lg text-gray-800">{invoice.studentName}</p>
                            <p className="text-gray-600">{invoice.studentClass}</p>
                            {invoice.admissionId && <p className="text-sm text-gray-500">ID: {invoice.admissionId}</p>}
                        </CardContent>
                    </Card>
                </div>
                <div className="text-right">
                     <Card className="rounded-lg shadow-none border-0 bg-blue-50 p-4">
                        <CardHeader className="pb-2 px-0 pt-0">
                             <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider text-left">Details</CardTitle>
                        </CardHeader>
                        <CardContent className="text-left space-y-1 px-0 pb-0">
                            <div className="grid grid-cols-2">
                                <span className="font-semibold text-gray-600">Date of Issue:</span>
                                <span className="text-right text-gray-800">{format(new Date(), 'dd MMM, yyyy')}</span>
                            </div>
                             <div className="grid grid-cols-2">
                                <span className="font-semibold text-gray-600">Due Date:</span>
                                 <span className="text-right text-gray-800">{format(new Date(invoice.dueDate || new Date()), 'dd MMM, yyyy')}</span>
                            </div>
                        </CardContent>
                     </Card>
                </div>
            </section>

            <section>
                 <div className="border rounded-lg overflow-hidden bg-transparent">
                    <Table className="w-full text-left bg-transparent">
                        <TableHeader className="bg-transparent">
                            <TableRow>
                                <TableHead className="p-3 font-semibold text-gray-500 uppercase tracking-wider">Description</TableHead>
                                <TableHead className="p-3 text-right font-semibold text-gray-500 uppercase tracking-wider">Amount (GHS)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoice.items?.map((item, index) => (
                                <TableRow key={index} className="border-b last:border-b-0">
                                    <TableCell className="p-3">{item.name}</TableCell>
                                    <TableCell className="p-3 text-right">{item.amount.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                 </div>
            </section>

            <section className="flex justify-end mt-8">
                <div className="w-full max-w-sm space-y-2 text-gray-600">
                     <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{invoice.totalAmount?.toFixed(2)}</span>
                    </div>
                     <div className="flex justify-between text-muted-foreground">
                        <span>Amount Paid</span>
                        <span>({invoice.amountPaid.toFixed(2)})</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center text-primary font-bold text-2xl">
                        <span>Balance Due</span>
                        <span>GHS {invoice.amount.toFixed(2)}</span>
                    </div>
                </div>
            </section>
            
            <Separator className="my-8" />
            
            <section className="grid grid-cols-2 gap-8">
                 <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment Terms</h3>
                    <div className="text-sm text-gray-600 space-y-1 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: paymentTerms.replace(/\\n/g, '<br />') }} />
                 </div>
                 <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Payment Methods</h3>
                    <div className="text-sm text-gray-600 space-y-1 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: paymentMethods.replace(/\\n/g, '<br />') }} />
                 </div>
            </section>

            <footer className="text-center mt-12 pt-8 border-t">
                <p className="text-xs text-muted-foreground">{schoolInfo.invoiceFooter}</p>
            </footer>
        </div>
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
