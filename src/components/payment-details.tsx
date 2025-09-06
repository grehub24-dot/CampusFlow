
'use client'

import React from 'react';
import type { Payment } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Calendar, Hash, Banknote, Tag, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from './ui/separator';

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | undefined | null }) => (
    <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-muted-foreground mt-1" />
        <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="font-medium text-gray-800">{value || 'N/A'}</p>
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
      <Card className="shadow-lg rounded-xl border-t-4 border-green-500">
        <CardHeader className="text-center bg-gray-50 rounded-t-xl p-6">
            <div className="mx-auto bg-green-100 rounded-full p-3 w-16 h-16 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-800 mt-4">Payment Received</CardTitle>
            <CardDescription className="text-gray-500">
                Transaction confirmed on {format(new Date(payment.date), 'PPP')}
            </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-center bg-green-50 p-4 rounded-lg">
                <p className="text-lg font-semibold text-green-800">Amount Paid</p>
                <p className="text-2xl font-bold text-green-600">GHS {payment.amount.toFixed(2)}</p>
            </div>

            <Separator />
            
            <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                <DetailItem icon={User} label="Student Name" value={payment.studentName} />
                <DetailItem icon={Calendar} label="Payment Date" value={format(new Date(payment.date), 'PPP, p')} />
                <DetailItem icon={Hash} label="Receipt / Ref No." value={payment.receiptNo} />
                <DetailItem icon={Banknote} label="Payment Method" value={payment.paymentMethod} />
                <DetailItem icon={Tag} label="Academic Term" value={`${payment.term}, ${payment.academicYear}`} />
            </div>
            
            <div>
                <h3 className="text-md font-semibold text-gray-600 mb-2">Fee Items Covered</h3>
                <div className="rounded-lg border">
                     <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr className="border-b">
                                <th className="p-2 text-left font-medium text-gray-500">Item</th>
                                <th className="p-2 text-right font-medium text-gray-500">Amount (GHS)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payment.items?.map((item, index) => (
                                <tr key={index} className="border-b last:border-b-0">
                                    <td className="p-2 text-gray-700">{item.name}</td>
                                    <td className="p-2 text-right text-gray-700">{item.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
                </div>
            </div>

            <Separator />
            
            <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                    <p className="text-gray-500">Total Bill for Term</p>
                    <p className="font-medium text-gray-700">GHS {payment.totalAmountDue.toFixed(2)}</p>
                </div>
                 <div className="flex justify-between items-center text-green-700">
                    <p>This Payment</p>
                    <p className="font-medium">- GHS {payment.amount.toFixed(2)}</p>
                </div>
                 <div className="flex justify-between items-center font-bold text-lg border-t pt-2 mt-2">
                    <p>Remaining Balance</p>
                    <p className={payment.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                        GHS {payment.balance.toFixed(2)}
                    </p>
                </div>
            </div>

        </CardContent>
      </Card>
    </div>
  );
}
