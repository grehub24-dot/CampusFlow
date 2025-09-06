
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
    <div className="p-1 pt-4 printable-area font-sans">
      <div className="relative w-[210mm] mx-auto p-8 bg-white text-gray-800 shadow-lg overflow-hidden">
        
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
                    <p className="text-gray-500 mt-1"># {invoice.admissionId}</p>
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
                            <p className="text-gray-600">Guardian: {invoice.amountPaid}</p>
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
                 <div className="border rounded-lg overflow-hidden">
                    <Table className="w-full text-left">
                        <TableHeader>
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
                                    <p className="text-sm text-gray-600">Dial <span className="font-mono font-semibold">*800*0*6491#</span> and use <span className="font-mono font-semibold">{invoice.admissionId}</span> as reference.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                 </div>
            </section>

            <footer className="text-center mt-12 pt-8 border-t">
              <div className="flex justify-center items-center">
                <svg width="240" height="48" viewBox="0 0 240 48" xmlns="http://www.w3.org/2000/svg">
                  <title>CompusFlow</title>
                  <desc>Enterprise tech logo – compute + flow</desc>
                  <g id="mark">
                    <path d="M4 24
                            A20 20 0 1 1 44 24
                            A20 20 0 1 1 4 24
                            M36 24
                            A12 12 0 1 0 12 24" 
                          stroke="#0033A0" strokeWidth="3" fill="none"/>
                    <path d="M28 18 l8 6 -8 6" 
                          stroke="#0033A0" strokeWidth="3" fill="none" 
                          strokeLinejoin="round" strokeLinecap="round"/>
                  </g>
                  <g id="wordmark" fill="#1F1F1F">
                    <text x="56" y="31" fontFamily="Helvetica Neue, Arial, sans-serif" 
                          fontSize="26" fontWeight="600" letterSpacing="-0.5">
                      CompusFlow
                    </text>
                  </g>
                </svg>
              </div>
              <p className="text-xs text-muted-foreground mt-3 italic">
                “CompusFlow – where code, connectivity & commerce flow together.”
              </p>
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
