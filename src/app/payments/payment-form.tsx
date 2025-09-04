
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  addDoc,
  collection,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

import type { Student, FeeStructure, FeeItem, AcademicTerm } from '@/types';
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

interface Props {
  students: Student[];
  feeStructures: FeeStructure[];
  currentTerm: AcademicTerm;
  onSuccess: () => void;
  defaultStudentId?: string;
}

export default function PaymentForm({
  students,
  feeStructures,
  currentTerm,
  onSuccess,
  defaultStudentId,
}: Props) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    defaultStudentId || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const { toast } = useToast();

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


  const allFeeItems: FeeItem[] = useMemo(() => {
    if (!matchingStructure) return [];
    return [
      { name: 'Admission Fee', amount: matchingStructure.admissionFee || 0 },
      { name: 'School Fees', amount: matchingStructure.schoolFees || 0 },
      { name: 'Books Fee', amount: matchingStructure.booksFee || 0 },
      { name: 'Uniform Fee', amount: matchingStructure.uniformFee || 0 },
      { name: 'Printing Fee', amount: matchingStructure.printingFee || 0 },
      { name: 'Others', amount: matchingStructure.others || 0 },
    ].filter(item => item.amount > 0); // Only include items with a cost
  }, [matchingStructure]);


  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!selectedStudent || !matchingStructure || !currentTerm) {
      setCheckedItems({});
      return;
    }

    const isNewAdmission = selectedStudent.admissionTerm === currentTerm.session &&
                         selectedStudent.admissionYear === currentTerm.academicYear;
    
    const termNumber = parseInt(currentTerm.session.split(' ')[0], 10);

    let initialChecks: Record<string, boolean> = {};

    if (isNewAdmission) {
      initialChecks = {
        'Admission Fee': true,
        'School Fees': true,
        'Books Fee': true,
        'Uniform Fee': true,
        'Others': true,
        'Printing Fee': false,
      };
    } else if (termNumber === 1) {
      initialChecks = {
        'Admission Fee': false,
        'School Fees': true,
        'Books Fee': true,
        'Uniform Fee': false,
        'Others': true,
        'Printing Fee': false,
      };
    } else { // Term 2 or 3
       initialChecks = {
        'Admission Fee': false,
        'School Fees': true,
        'Books Fee': false,
        'Uniform Fee': false,
        'Others': true,
        'Printing Fee': false,
      };
    }

    setCheckedItems(initialChecks);

  }, [selectedStudent, matchingStructure, currentTerm]);

  const total = useMemo(() => {
    return allFeeItems.reduce(
      (sum, item) => (checkedItems[item.name] ? sum + item.amount : sum),
      0
    );
  }, [allFeeItems, checkedItems]);

  useEffect(() => {
    if (defaultStudentId) setSelectedStudentId(defaultStudentId);
  }, [defaultStudentId]);

  const toggleCheck = (name: string) =>
    setCheckedItems((prev) => ({ ...prev, [name]: !prev[name] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || total <= 0) return;
    setIsSubmitting(true);

    try {
      const itemsToPay = allFeeItems.filter((i) => checkedItems[i.name]);

      const payload = {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        amount: total,
        date: new Date().toISOString(),
        status: 'Paid',
        paymentMethod,
        academicYear: currentTerm.academicYear,
        term: currentTerm.session,
        items: itemsToPay,
      };

      await addDoc(collection(db, 'payments'), payload);
      await updateDoc(doc(db, 'students', selectedStudent.id), {
        paymentStatus: 'Paid',
      });

      toast({
        title: 'Payment Recorded',
        description: `Payment of GHS ${total.toFixed(
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
        <h3 className="font-medium mb-2">Fee Items</h3>
        <div className="space-y-2 border rounded-md p-4">
          {allFeeItems.length > 0 ? allFeeItems.map((item) => (
            <div
              key={item.name}
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
                  className="text-sm font-normal cursor-pointer"
                >
                  {item.name}
                </Label>
              </div>
              <span className="text-sm font-medium">
                GHS {item.amount.toFixed(2)}
              </span>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No fee structure found for this student for the current term.
            </p>
          )}

          {allFeeItems.length > 0 && (
            <>
                <hr className="my-2" />
                <div className="flex justify-between items-center font-bold">
                    <span>Grand Total</span>
                    <span>GHS {total.toFixed(2)}</span>
                </div>
            </>
          )}
        </div>
      </div>

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
        <Label className="block font-medium mb-1">Total Amount (GHS)</Label>
        <Input
          type="number"
          value={total.toFixed(2)}
          readOnly
          className="bg-muted"
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!selectedStudent || total <= 0 || isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Record Payment
        </Button>
      </div>
    </form>
  );
}
