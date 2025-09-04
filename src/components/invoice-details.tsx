
'use client'

import React from 'react';
import type { Invoice } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Calendar, Hash, Banknote, Tag, Landmark, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from './ui/separator';

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | undefined | null }) => (
    <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-muted-foreground mt-1" />
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-medium">{value || 'N/A'}</p>
        </div>
    </div>
);

interface InvoiceDetailsProps {
    invoice: Invoice;
}

export function InvoiceDetails({ invoice }: InvoiceDetailsProps) {
  if (!invoice) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-1 pt-4">
      <Card className="shadow-none border-0">
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-2xl">Invoice</CardTitle>
                    <CardDescription>
                        Bill for {invoice.studentName} ({invoice.studentClass})
                    </CardDescription>
                </div>
                 <div className="text-right">
                    <p className="text-lg font-semibold text-destructive">GHS {invoice.amount.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Amount Due</p>
                 </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-6">
            <Separator />
            <div className="grid md:grid-cols-2 gap-6">
                <DetailItem icon={User} label="Student Name" value={invoice.studentName} />
                <DetailItem icon={Calendar} label="Due Date" value={format(new Date(invoice.dueDate), 'PPP')} />
            </div>
            
            <div>
                <h3 className="text-lg font-semibold mb-2">Invoice Items</h3>
                <div className="rounded-md border">
                     <table className="w-full text-sm">
                        <thead className="bg-muted">
                            <tr className="border-b">
                                <th className="p-2 text-left font-medium">Item</th>
                                <th className="p-2 text-right font-medium">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items?.map((item, index) => (
                                <tr key={index} className="border-b last:border-b-0">
                                    <td className="p-2">{item.name}</td>
                                    <td className="p-2 text-right">GHS {item.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
                </div>
            </div>

            <Separator />
            
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <p className="text-muted-foreground">Total Bill</p>
                    <p className="font-medium">GHS {invoice.totalAmount.toFixed(2)}</p>
                </div>
                 <div className="flex justify-between items-center">
                    <p className="text-muted-foreground">Amount Paid</p>
                    <p className="font-medium text-primary">GHS {invoice.amountPaid.toFixed(2)}</p>
                </div>
                 <div className="flex justify-between items-center font-bold text-lg">
                    <p>Balance Due</p>
                    <p className="text-destructive">GHS {invoice.amount.toFixed(2)}</p>
                </div>
            </div>

            <Separator />

             <div>
                <h3 className="text-lg font-semibold mb-4">Mode of Payment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-3">
                        <Landmark className="h-5 w-5 text-muted-foreground" />
                        <span>Please contact the school office for payment details.</span>
                    </div>
                     <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <span>+233 12 345 6789</span>
                    </div>
                </div>
            </div>

        </CardContent>
      </Card>
    </div>
  );
}
