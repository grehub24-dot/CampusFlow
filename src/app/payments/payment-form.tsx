
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  addDoc,
  collection,
  doc,
  updateDoc,
  onSnapshot,
  query
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { sendSms } from '@/lib/frog-api';


import type { Student, FeeStructure, AcademicTerm, PaymentFeeItem, FeeItem, Payment, CommunicationTemplate } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Props {
  students: Student[];
  feeStructures: FeeStructure[];
  payments: Payment[];
  currentTerm: AcademicTerm;
  onSuccess: () => void;
  defaultStudentId?: string;
}

// Define which fees should be prioritized for payment.
const CORE_FEE_PRIORITY = ['Admission fees', 'School Fees', 'Books', 'Uniforms'];


export default function PaymentForm({
  students,
  feeStructures,
  payments,
  currentTerm,
  onSuccess,
  defaultStudentId,
}: Props) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    defaultStudentId || ''
  );
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [receiptNo, setReceiptNo] = useState('');
  const [payingAmount, setPayingAmount] = useState(0);
  const [amountTendered, setAmountTendered] = useState(0);
  const { toast } = useToast();
  const [receiptLabel, setReceiptLabel] = useState('Receipt No.');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [smsTemplates, setSmsTemplates] = useState<Record<string, CommunicationTemplate>>({});

  useEffect(() => {
    switch (paymentMethod) {
      case 'Momo':
        setReceiptLabel('Reference No.');
        break;
      case 'Bank Transfer':
        setReceiptLabel('Transfer ID');
        break;
      case 'Cheque':
        setReceiptLabel('Cheque No.');
        break;
      default:
        setReceiptLabel('Receipt No.');
    }
  }, [paymentMethod]);

  useEffect(() => {
    const feeItemsQuery = query(collection(db, "fee-items"));
    const unsubscribeFeeItems = onSnapshot(feeItemsQuery, (snapshot) => {
        const data: FeeItem[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeItem));
        setFeeItems(data);
    });
    
    const smsTemplatesRef = collection(db, "settings", "templates", "sms");
    const unsubscribeSmsTemplates = onSnapshot(smsTemplatesRef, (snapshot) => {
        const fetchedTemplates: Record<string, CommunicationTemplate> = {};
        snapshot.forEach((doc) => {
            fetchedTemplates[doc.id] = { id: doc.id, ...doc.data() } as CommunicationTemplate;
        });
        setSmsTemplates(fetchedTemplates);
    });

    return () => {
      unsubscribeFeeItems();
      unsubscribeSmsTemplates();
    }
  }, []);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId),
    [students, selectedStudentId]
  );

  const matchingStructure = useMemo(() => {
    if (!selectedStudent || !selectedStudent.classId || !currentTerm) return null;
    return feeStructures.find(
      (fs) =>
        fs.classId === selectedStudent.classId &&
        fs.academicTermId === currentTerm.id
    );
  }, [feeStructures, selectedStudent, currentTerm]);

  const allFeeItemsForForm: PaymentFeeItem[] = useMemo(() => {
    if (!matchingStructure || !Array.isArray(matchingStructure.items) || feeItems.length === 0) return [];
    
    return matchingStructure.items.map(item => {
        const feeItemInfo = feeItems.find(fi => fi.id === item.feeItemId);
        return {
            name: feeItemInfo?.name || 'Unknown Fee',
            amount: item.amount,
            id: item.feeItemId,
            isOptional: feeItemInfo?.isOptional || false,
        };
    }).filter(item => item.amount > 0);
  }, [matchingStructure, feeItems]);

  const isNewAdmissionForTerm = useMemo(() => {
    if (!selectedStudent || !currentTerm) return false;
    const isNew = selectedStudent.admissionTerm === currentTerm.session &&
                  selectedStudent.admissionYear === currentTerm.academicYear;
    return isNew;
  }, [selectedStudent, currentTerm]);

  useEffect(() => {
    if (!selectedStudent || !matchingStructure || !currentTerm || feeItems.length === 0 || !Array.isArray(matchingStructure.items)) {
      setCheckedItems({});
      return;
    }
    
    const termNumber = selectedStudent.currentTermNumber || parseInt(currentTerm.session.split(' ')[0], 10);

    let initialChecks: Record<string, boolean> = {};

    matchingStructure.items.forEach(item => {
        const feeItemInfo = feeItems.find(fi => fi.id === item.feeItemId);
        if (feeItemInfo) {
            if (isNewAdmissionForTerm) {
                initialChecks[feeItemInfo.name] = !feeItemInfo.isOptional;
            } else {
                if (feeItemInfo.isOptional) {
                    initialChecks[feeItemInfo.name] = false;
                } else if (termNumber === 1) {
                    initialChecks[feeItemInfo.name] = feeItemInfo.appliesTo.includes('term1');
                } else {
                    initialChecks[feeItemInfo.name] = feeItemInfo.appliesTo.includes('term2_3');
                }
            }
        }
    });
    setCheckedItems(initialChecks);

  }, [selectedStudent, matchingStructure, currentTerm, feeItems, isNewAdmissionForTerm]);

  const totalAmountDue = useMemo(() => {
    return allFeeItemsForForm.reduce(
      (sum, item) => (checkedItems[item.name] ? sum + item.amount : sum),
      0
    );
  }, [allFeeItemsForForm, checkedItems]);
  
  const studentPaymentsThisTerm = useMemo(() => {
      if (!selectedStudent || !currentTerm) return [];
      return payments.filter(p => 
            p.studentId === selectedStudent.id &&
            p.academicYear === currentTerm.academicYear &&
            p.term === currentTerm.session
        );
  }, [selectedStudent, currentTerm, payments]);

  const amountPaidPerItem = useMemo(() => {
      const paidMap = new Map<string, number>();
      studentPaymentsThisTerm.forEach(p => {
          if(Array.isArray(p.items)) {
              p.items.forEach(item => {
                  paidMap.set(item.name, (paidMap.get(item.name) || 0) + item.amount);
              });
          }
      });
      return paidMap;
  }, [studentPaymentsThisTerm]);

  const outstandingBalancePerItem = useMemo(() => {
    const balanceMap = new Map<string, number>();
    allFeeItemsForForm.forEach(item => {
        if (checkedItems[item.name]) {
            const paid = amountPaidPerItem.get(item.name) || 0;
            const balance = item.amount - paid;
            if (balance > 0) {
                balanceMap.set(item.name, balance);
            }
        }
    });
    return balanceMap;
  }, [allFeeItemsForForm, checkedItems, amountPaidPerItem]);


  const outstandingBalance = useMemo(() => {
    let total = 0;
    outstandingBalancePerItem.forEach(balance => total += balance);
    return total;
  }, [outstandingBalancePerItem]);


  const previouslyPaid = useMemo(() => {
    return studentPaymentsThisTerm.reduce((sum, p) => sum + p.amount, 0);
  }, [studentPaymentsThisTerm]);

  const newBalance = useMemo(() => {
    const balance = outstandingBalance - payingAmount;
    return Math.max(0, balance);
  }, [outstandingBalance, payingAmount]);

  const change = useMemo(() => {
    if (amountTendered > 0 && amountTendered >= payingAmount) {
      return amountTendered - payingAmount;
    }
    return 0;
  }, [amountTendered, payingAmount]);

    const paymentAllocation = useMemo(() => {
        let amountToAllocate = payingAmount;
        const allocationMap = new Map<string, number>();

        const sortedFeeItems = [...allFeeItemsForForm].sort((a, b) => {
            const aIsCore = CORE_FEE_PRIORITY.includes(a.name);
            const bIsCore = CORE_FEE_PRIORITY.includes(b.name);
            if (aIsCore && !bIsCore) return -1;
            if (!aIsCore && bIsCore) return 1;
            if (aIsCore && bIsCore) {
                return CORE_FEE_PRIORITY.indexOf(a.name) - CORE_FEE_PRIORITY.indexOf(b.name);
            }
            return 0; // or sort by name/amount if needed for non-core items
        });

        for (const item of sortedFeeItems) {
            if (amountToAllocate <= 0) break;
            const balanceForItem = outstandingBalancePerItem.get(item.name) || 0;

            if (balanceForItem > 0) {
                const amountToPayForItem = Math.min(amountToAllocate, balanceForItem);
                allocationMap.set(item.name, amountToPayForItem);
                amountToAllocate -= amountToPayForItem;
            }
        }
        return allocationMap;
    }, [payingAmount, outstandingBalancePerItem, allFeeItemsForForm]);


  useEffect(() => {
    if (!selectedStudent || !currentTerm) {
      setPayingAmount(0);
      return;
    }
    setPayingAmount(outstandingBalance > 0 ? outstandingBalance : 0);
  }, [outstandingBalance, selectedStudent, currentTerm]);

  useEffect(() => {
    if (defaultStudentId) setSelectedStudentId(defaultStudentId);
  }, [defaultStudentId]);
  
  const toggleCheck = (name: string) => {
    setCheckedItems((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || payingAmount <= 0 || totalAmountDue <= 0) return;
    setIsSubmitting(true);
    
    const allocatedItems: PaymentFeeItem[] = [];
    paymentAllocation.forEach((amount, name) => {
        if (amount > 0) {
            allocatedItems.push({ name, amount });
        }
    });

    try {
      const newPaymentStatus = payingAmount < outstandingBalance ? 'Part Payment' : 'Full Payment';
      const newStudentStatus = newBalance <= 0 ? 'Paid' : 'Part-Payment';

      const payload = {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        amount: payingAmount,
        totalAmountDue: totalAmountDue,
        balance: newBalance,
        receiptNo: receiptNo,
        date: new Date().toISOString(),
        status: newPaymentStatus,
        paymentMethod,
        academicYear: currentTerm.academicYear,
        term: currentTerm.session,
        items: allocatedItems,
      };

      await addDoc(collection(db, 'payments'), payload);
      
      await updateDoc(doc(db, 'students', selectedStudent.id), {
        paymentStatus: newStudentStatus,
      });

      toast({
        title: 'Payment Recorded',
        description: `Payment of GHS ${payingAmount.toFixed(
          2
        )} for ${selectedStudent.name} was successful.`,
      });
      
      // Send SMS notification
      if (selectedStudent.guardianPhone) {
        const template = smsTemplates['payment-confirmation'];
        if (template && template.content) {
            let message = template.content
                .replace('{{studentName}}', selectedStudent.name)
                .replace('{{amountPaid}}', payingAmount.toFixed(2))
                .replace('{{newBalance}}', newBalance.toFixed(2));
            
            sendSms([selectedStudent.guardianPhone], message).then(result => {
                if(result.success) {
                    toast({ title: 'Confirmation Sent', description: 'SMS sent to guardian.' })
                } else {
                    toast({ variant: 'destructive', title: 'SMS Failed', description: 'Could not send confirmation SMS.' })
                }
            });
        }
      }


      onSuccess();
    } catch (error) {
      console.error('Error recording payment: ', error);
      toast({
        variant: 'destructive',
        title: 'Save Error',
        description: 'Could not record the payment. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="student-select">Student</Label>
        <Select
          onValueChange={setSelectedStudentId}
          value={selectedStudentId}
          disabled={!!defaultStudentId}
        >
          <SelectTrigger id="student-select">
            <SelectValue placeholder="-- Select --" />
          </SelectTrigger>
          <SelectContent>
            {students.map((stu) => (
              <SelectItem key={stu.id} value={stu.id}>
                {stu.name} ({stu.class})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedStudent && selectedStudent.admissionId && (
          <p className="text-sm text-muted-foreground mt-2">
            Admission ID: {selectedStudent.admissionId}
          </p>
        )}
      </div>

      <div>
        <h3 className="font-medium mb-2">
            Fee Items for {currentTerm.session} ({currentTerm.academicYear})
        </h3>
        <div className="space-y-2 border rounded-md p-4 max-h-[250px] overflow-y-auto">
          {allFeeItemsForForm.length > 0 ? allFeeItemsForForm.map((item) => {
            return (
                <div
                key={item.id}
                className="flex justify-between items-center"
                >
                <div className="flex items-center gap-2">
                    <Checkbox
                    id={item.name}
                    checked={checkedItems[item.name] ?? false}
                    onCheckedChange={() => toggleCheck(item.name)}
                    />
                    <Label
                    htmlFor={item.name}
                    className={cn("text-sm font-normal cursor-pointer")}
                    >
                    {item.name} {item.isOptional && <span className="text-muted-foreground text-xs">(Optional)</span>}
                    </Label>
                </div>
                <span className="text-sm font-medium">
                    GHS {item.amount.toFixed(2)}
                </span>
                </div>
            )
          }) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No fee structure found for this student for the current term.
            </p>
          )}
        </div>
        {allFeeItemsForForm.length > 0 && (
          <div className="border-t mt-4 pt-4 flex justify-between items-center font-bold text-lg">
              <span>Total Bill</span>
              <span>GHS {totalAmountDue.toFixed(2)}</span>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
            <Label htmlFor="payment-method">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger id="payment-method">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Momo">Mobile Money</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
            </SelectContent>
            </Select>
        </div>
        <div>
          <Label htmlFor="receiptNo">{receiptLabel}</Label>
          <Input
            id="receiptNo"
            type="text"
            value={receiptNo}
            onChange={(e) => setReceiptNo(e.target.value)}
            placeholder="e.g. 12345"
          />
        </div>
      </div>
       
       <div className="grid grid-cols-2 gap-4">
         <div>
          <Label>Previously Paid (GHS)</Label>
          <Input
            type="number"
            value={previouslyPaid.toFixed(2)}
            readOnly
            className="bg-muted"
          />
        </div>
        <div>
          <Label>Outstanding Balance (GHS)</Label>
          <Input
            type="number"
            value={outstandingBalance.toFixed(2)}
            readOnly
            className="font-bold"
          />
        </div>
      </div>

       <div className="border p-4 rounded-md bg-muted/50 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payingAmount">Paying Amount (GHS)</Label>
              <Input
                id="payingAmount"
                type="number"
                value={payingAmount || ''}
                onChange={(e) => setPayingAmount(parseFloat(e.target.value) || 0)}
                 className="bg-background font-bold text-blue-600 text-3xl h-auto p-2"
              />
            </div>
            <div>
              <Label>New Balance</Label>
              <Input
                type="text"
                value={`GHS ${newBalance.toFixed(2)}`}
                readOnly
                className={cn(
                  "bg-background font-bold h-auto p-2 text-2xl",
                  newBalance > 0 ? "text-red-500" : "text-green-600"
                )}
              />
            </div>
          </div>
           {payingAmount > 0 && (
                <div>
                    <Label className="text-sm font-medium">Payment Allocation Breakdown</Label>
                    <div className="rounded-md border bg-background mt-2">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fee Item</TableHead>
                                    <TableHead className="text-right">Outstanding</TableHead>
                                    <TableHead className="text-right">Allocated</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Array.from(outstandingBalancePerItem.entries()).map(([name, balance]) => {
                                    const allocated = paymentAllocation.get(name) || 0;
                                    if(balance > 0) {
                                      return (
                                          <TableRow key={name}>
                                              <TableCell>{name}</TableCell>
                                              <TableCell className="text-right">GHS {balance.toFixed(2)}</TableCell>
                                              <TableCell className="text-right font-semibold text-green-600">GHS {allocated.toFixed(2)}</TableCell>
                                          </TableRow>
                                      )
                                    }
                                    return null;
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amountTendered">Amount Tendered</Label>
              <Input
                id="amountTendered"
                type="number"
                value={amountTendered || ''}
                onChange={(e) => setAmountTendered(parseFloat(e.target.value) || 0)}
                 className="bg-background"
              />
            </div>
            {amountTendered > 0 && (
             <div >
              <Label>Change</Label>
              <Input
                type="text"
                value={`GHS ${change.toFixed(2)}`}
                readOnly
                className="bg-background font-bold text-green-600"
              />
            </div>
            )}
          </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!selectedStudent || payingAmount <= 0 || isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Record Payment
        </Button>
      </div>
    </form>
  );
}
