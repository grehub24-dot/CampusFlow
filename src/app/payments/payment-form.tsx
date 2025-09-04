
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

import type { Student, FeeStructure, AcademicTerm, PaymentFeeItem, FeeItem, Payment } from '@/types';
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

interface Props {
  students: Student[];
  feeStructures: FeeStructure[];
  payments: Payment[];
  currentTerm: AcademicTerm;
  onSuccess: () => void;
  defaultStudentId?: string;
}

const MANDATORY_NEW_ADMISSION_FEES = ['Admission fees', 'Books', 'Uniforms', 'School Fees'];


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
  const [currentAmountPaid, setCurrentAmountPaid] = useState(0);
  const [amountTendered, setAmountTendered] = useState(0);
  const { toast } = useToast();
  const [receiptLabel, setReceiptLabel] = useState('Receipt No');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

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
    return () => unsubscribeFeeItems();
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
     // Student is considered new if their admission term matches the current term.
    const isNew = selectedStudent.admissionTerm === currentTerm.session &&
                  selectedStudent.admissionYear === currentTerm.academicYear;
    if (isNew) return true;

    // Also check if any payment has been made for this term. If not, treat as first payment.
    const paymentsThisTerm = payments.some(p => 
      p.studentId === selectedStudent.id &&
      p.academicYear === currentTerm.academicYear &&
      p.term === currentTerm.session
    );

    return !paymentsThisTerm;

  }, [selectedStudent, currentTerm, payments]);

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
                // Logic for new admissions
                if (MANDATORY_NEW_ADMISSION_FEES.includes(feeItemInfo.name)) {
                    initialChecks[feeItemInfo.name] = true; // Mandatory and checked
                } else {
                     initialChecks[feeItemInfo.name] = !feeItemInfo.isOptional; // Optional fees are unchecked
                }
            } else {
                // Logic for continuing students
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
  
  const previouslyPaid = useMemo(() => {
    if (!selectedStudent || !currentTerm) return 0;
    return payments
        .filter(p => 
            p.studentId === selectedStudent.id &&
            p.academicYear === currentTerm.academicYear &&
            p.term === currentTerm.session
        )
        .reduce((sum, p) => sum + p.amount, 0);
  }, [selectedStudent, currentTerm, payments]);

  const balance = useMemo(() => totalAmountDue - previouslyPaid - currentAmountPaid, [totalAmountDue, previouslyPaid, currentAmountPaid]);
  const change = useMemo(() => {
    if (amountTendered > 0 && amountTendered >= currentAmountPaid) {
      return amountTendered - currentAmountPaid;
    }
    return 0;
  }, [amountTendered, currentAmountPaid]);


  useEffect(() => {
    if (!selectedStudent || !currentTerm) {
      setCurrentAmountPaid(0);
      return;
    }
    
    const outstandingBalance = totalAmountDue - previouslyPaid;
    setCurrentAmountPaid(outstandingBalance > 0 ? outstandingBalance : 0);

  }, [totalAmountDue, previouslyPaid, selectedStudent, currentTerm, payments, checkedItems]);

  useEffect(() => {
    if (defaultStudentId) setSelectedStudentId(defaultStudentId);
  }, [defaultStudentId]);

  const toggleCheck = (name: string, isMandatory: boolean) => {
    if (isMandatory) return; // Do not allow unchecking mandatory fees for new admissions
    setCheckedItems((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || currentAmountPaid <= 0 || totalAmountDue <= 0) return;
    setIsSubmitting(true);

    try {
      const itemsToPay = allFeeItemsForForm.filter((i) => checkedItems[i.name]);
      const finalBalance = totalAmountDue - previouslyPaid - currentAmountPaid;
      const newStatus = finalBalance <= 0 ? 'Paid' : 'Part-Payment';

      const payload = {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        amount: currentAmountPaid,
        totalAmountDue: totalAmountDue,
        balance: finalBalance,
        receiptNo: receiptNo,
        date: new Date().toISOString(),
        status: 'Paid', // Payment itself is always considered paid/complete
        paymentMethod,
        academicYear: currentTerm.academicYear,
        term: currentTerm.session,
        items: itemsToPay.map(i => ({ name: i.name, amount: i.amount })),
      };

      await addDoc(collection(db, 'payments'), payload);
      
      await updateDoc(doc(db, 'students', selectedStudent.id), {
        paymentStatus: newStatus,
      });

      toast({
        title: 'Payment Recorded',
        description: `Payment of GHS ${currentAmountPaid.toFixed(
          2
        )} for ${selectedStudent.name} was successful.`,
      });
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
      </div>

      <div>
        <h3 className="font-medium mb-2">
            Fee Items for {currentTerm.session} ({currentTerm.academicYear})
        </h3>
        <div className="space-y-2 border rounded-md p-4">
          {allFeeItemsForForm.length > 0 ? allFeeItemsForForm.map((item) => {
            const isMandatory = isNewAdmissionForTerm && MANDATORY_NEW_ADMISSION_FEES.includes(item.name);
            return (
                <div
                key={item.id}
                className="flex justify-between items-center"
                >
                <div className="flex items-center gap-2">
                    <Checkbox
                    id={item.name}
                    checked={checkedItems[item.name] ?? false}
                    onCheckedChange={() => toggleCheck(item.name, isMandatory)}
                    disabled={isMandatory}
                    />
                    <Label
                    htmlFor={item.name}
                    className={cn("text-sm font-normal", !isMandatory && "cursor-pointer")}
                    >
                    {item.name} {isMandatory && <span className="text-muted-foreground text-xs">(Mandatory)</span>}
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

          {allFeeItemsForForm.length > 0 && (
            <>
                <hr className="my-2" />
                <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total Bill</span>
                    <span>GHS {totalAmountDue.toFixed(2)}</span>
                </div>
            </>
          )}
        </div>
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
          <Label htmlFor="currentAmountPaid">Amount to Pay (GHS)</Label>
          <Input
            id="currentAmountPaid"
            type="number"
            value={currentAmountPaid || ''}
            onChange={(e) => setCurrentAmountPaid(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

       <div className="border p-4 rounded-md bg-muted/50 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>New Balance (GHS)</Label>
              <Input
                type="text"
                value={balance.toFixed(2)}
                readOnly
                className="bg-background font-bold text-lg h-auto p-2"
              />
            </div>
            <div>
              <Label htmlFor="amountTendered">Amount Tendered (GHS)</Label>
              <Input
                id="amountTendered"
                type="number"
                value={amountTendered || ''}
                onChange={(e) => setAmountTendered(parseFloat(e.target.value) || 0)}
                 className="bg-background"
              />
            </div>
          </div>
          {amountTendered > 0 && (
             <div >
              <Label>Change (GHS)</Label>
              <Input
                type="text"
                value={change.toFixed(2)}
                readOnly
                className="bg-background font-bold text-green-600 text-lg h-auto p-2"
              />
            </div>
          )}
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!selectedStudent || currentAmountPaid <= 0 || isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Record Payment
        </Button>
      </div>
    </form>
  );
}

    