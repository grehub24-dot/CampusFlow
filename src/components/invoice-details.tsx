
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

  return (
    <div className="p-1 pt-4 printable-area font-sans bg-gray-50">
      <div className="w-[210mm] mx-auto p-8 bg-white text-gray-800 shadow-lg">
        <header className="text-center pb-8 border-b-2 border-primary">
            <Image src={schoolInfo.logoUrl || "https://picsum.photos/120/50"} width={80} height={80} alt="School Logo" data-ai-hint="logo" className="object-contain mx-auto mb-4" />
            <div>
                <h2 className="text-2xl font-bold text-primary">{schoolInfo.schoolName}</h2>
                <p className="text-xs text-gray-500">{schoolInfo.address}</p>
                <p className="text-xs text-gray-500">{schoolInfo.phone}</p>
            </div>
        </header>
        
        <div className="text-center my-4">
             <h1 className="text-4xl font-bold text-gray-700">INVOICE</h1>
             <p className="text-gray-500 mt-1">Invoice #: {invoice.id}</p>
        </div>


        <section className="grid grid-cols-2 gap-8 my-8">
            <div>
                <Card className="bg-gray-50 border-none">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Billed To</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="font-bold text-lg">{invoice.studentName}</p>
                        <p className="text-muted-foreground">{invoice.studentClass}</p>
                        <p className="text-muted-foreground">Guardian: {invoice.amountPaid}</p>
                    </CardContent>
                </Card>
            </div>
            <div className="text-right">
                 <Card className="bg-gray-50 border-none">
                    <CardHeader>
                         <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider text-left">Details</CardTitle>
                    </CardHeader>
                    <CardContent className="text-left">
                        <div className="grid grid-cols-2">
                            <span className="font-semibold text-muted-foreground">Date of Issue:</span>
                            <span className="text-right">{format(new Date(), 'dd MMM, yyyy')}</span>
                        </div>
                         <div className="grid grid-cols-2">
                            <span className="font-semibold text-muted-foreground">Due Date:</span>
                             <span className="text-right">{format(new Date(invoice.dueDate || new Date()), 'dd MMM, yyyy')}</span>
                        </div>
                    </CardContent>
                 </Card>
            </div>
        </section>

        <section>
             <Card>
                <Table className="w-full text-left">
                    <TableHeader className="bg-muted">
                        <TableRow>
                            <TableHead className="p-3 font-semibold">Description</TableHead>
                            <TableHead className="p-3 text-right font-semibold">Amount (GHS)</TableHead>
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
             </Card>
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
