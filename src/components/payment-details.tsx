
'use client'

import React from 'react';
import type { Payment } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Calendar, Hash, Banknote, Tag } from 'lucide-react';
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

interface PaymentDetailsProps {
    payment: Payment;
}

export function PaymentDetails({ payment }: PaymentDetailsProps) {
  if (!payment) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-1 pt-4">
      <Card className="shadow-none border-0">
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-2xl">Payment Receipt</CardTitle>
                    <CardDescription>
                        Receipt for transaction on {format(new Date(payment.date), 'PPP')}
                    </CardDescription>
                </div>
                 <div className="text-right">
                    <p className="text-lg font-semibold text-primary">GHS {payment.amount.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Amount Paid</p>
                 </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-6">
            <Separator />
            <div className="grid md:grid-cols-2 gap-6">
                <DetailItem icon={User} label="Student Name" value={payment.studentName} />
                <DetailItem icon={Calendar} label="Payment Date" value={format(new Date(payment.date), 'PPP, p')} />
                <DetailItem icon={Hash} label="Receipt / Ref No." value={payment.receiptNo} />
                <DetailItem icon={Banknote} label="Payment Method" value={payment.paymentMethod} />
                <DetailItem icon={Tag} label="Academic Term" value={`${payment.term}, ${payment.academicYear}`} />
            </div>
            
            <div>
                <h3 className="text-lg font-semibold mb-2">Fee Items Covered</h3>
                <div className="rounded-md border">
                     <table className="w-full text-sm">
                        <thead className="bg-muted">
                            <tr className="border-b">
                                <th className="p-2 text-left font-medium">Item</th>
                                <th className="p-2 text-right font-medium">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payment.items?.map((item, index) => (
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
                    <p className="text-muted-foreground">Total Bill for Term</p>
                    <p className="font-medium">GHS {payment.totalAmountDue.toFixed(2)}</p>
                </div>
                 <div className="flex justify-between items-center">
                    <p className="text-muted-foreground">Amount Paid</p>
                    <p className="font-medium text-primary">GHS {payment.amount.toFixed(2)}</p>
                </div>
                 <div className="flex justify-between items-center font-bold text-lg">
                    <p>Balance Due</p>
                    <p>GHS {payment.balance.toFixed(2)}</p>
                </div>
            </div>

        </CardContent>
      </Card>
    </div>
  );
}
