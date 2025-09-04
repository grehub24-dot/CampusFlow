
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Student, FeeStructure, FeeItem, AcademicTerm } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';


interface Props {
  students: Student[];
  feeStructures: FeeStructure[];
  currentTerm: AcademicTerm;
  onSuccess: () => void;
  defaultStudentId?: string;
}

export default function PaymentForm({ students, feeStructures, currentTerm, onSuccess, defaultStudentId }: Props) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(defaultStudentId || '');
  const [total, setTotal] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const { toast } = useToast();
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);


  const selectedStudent = useMemo(
    () => students.find(s => s.id === selectedStudentId),
    [students, selectedStudentId]
  );

  const matchingStructure = useMemo(() => {
    if (!selectedStudent || !selectedStudent.classId || !currentTerm) return null;
    // Find the fee structure that matches the student's class and the current term.
    return feeStructures.find(
      fs =>
        fs.classId === selectedStudent.classId &&
        fs.academicTermId === currentTerm.id
    );
  }, [feeStructures, selectedStudent, currentTerm]);

  useEffect(() => {
    if (!matchingStructure || !selectedStudent) {
      setFeeItems([]);
      return;
    }

    const allItems: FeeItem[] = [];
    
    // ADMISSION FEE – check if new student
    if (matchingStructure.admissionFee) {
        allItems.push({ name: 'Admission Fee', amount: matchingStructure.admissionFee, included: !!selectedStudent.isNewAdmission });
    }

    // Always include school fees
    if (matchingStructure.schoolFees) {
      allItems.push({ name: 'School Fees', amount: matchingStructure.schoolFees, included: true });
    }
    
    // BOOKS & UNIFORM – check if NOT (old student AND 1st term)
    const skipBooksUniform = !selectedStudent.isNewAdmission && selectedStudent.currentTermNumber === 1;

    if (matchingStructure.booksFee) {
        allItems.push({ name: 'Books Fee', amount: matchingStructure.booksFee, included: !skipBooksUniform });
    }
    if (matchingStructure.uniformFee) {
        allItems.push({ name: 'Uniform Fee', amount: matchingStructure.uniformFee, included: !skipBooksUniform });
    }

    // Always include printing fees
    if (matchingStructure.printingFee) {
      allItems.push({ name: 'Printing Fee', amount: matchingStructure.printingFee, included: true });
    }
    if (matchingStructure.others) {
      allItems.push({ name: 'Others', amount: matchingStructure.others, included: true });
    }

    setFeeItems(allItems);
  }, [matchingStructure, selectedStudent]);


  useEffect(() => {
    const newTotal = feeItems.reduce((sum, item) => item.included ? sum + item.amount : sum, 0);
    setTotal(newTotal);
  }, [feeItems]);
  
  useEffect(() => {
    if (defaultStudentId) {
        setSelectedStudentId(defaultStudentId)
    }
  }, [defaultStudentId]);
  
  const handleFeeItemToggle = (itemName: string) => {
    setFeeItems(prevItems =>
      prevItems.map(item =>
        item.name === itemName ? { ...item, included: !item.included } : item
      )
    );
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setIsSubmitting(true);

    try {
      const itemsToPay = feeItems.filter(item => item.included);

      const payload = {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        amount: total,
        date: new Date().toISOString(),
        status: 'Paid',
        paymentMethod: paymentMethod,
        academicYear: currentTerm.academicYear,
        term: currentTerm.session,
        items: itemsToPay,
      };

      await addDoc(collection(db, "payments"), payload);
      await updateDoc(doc(db, "students", selectedStudent.id), { paymentStatus: 'Paid' });

      toast({
        title: 'Payment Recorded',
        description: `Payment of GHS ${total.toFixed(2)} for ${selectedStudent.name} was successful.`,
      });
      onSuccess();
    } catch (error) {
      console.error("Error recording payment: ", error);
      toast({
        variant: "destructive",
        title: "Save Error",
        description: "Could not record the payment. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor='student-select'>Select a student</Label>
         <Select onValueChange={setSelectedStudentId} value={selectedStudentId} disabled={!!defaultStudentId}>
            <SelectTrigger id="student-select">
                <SelectValue placeholder="-- Select --" />
            </SelectTrigger>
            <SelectContent>
            {students.map(stu => (
                <SelectItem key={stu.id} value={stu.id}>
                {stu.name} ({stu.class})
                </SelectItem>
            ))}
            </SelectContent>
        </Select>
      </div>

      {feeItems.length > 0 && (
        <div>
          <h3 className="font-medium mb-2">Fee Items</h3>
          <div className="space-y-2 border rounded-md p-4">
            {feeItems.map(item => (
              <div key={item.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Checkbox
                        id={item.name}
                        checked={item.included}
                        onCheckedChange={() => handleFeeItemToggle(item.name)}
                    />
                    <Label htmlFor={item.name} className="text-sm font-normal cursor-pointer">{item.name}</Label>
                </div>
                <span className="text-sm font-medium">
                  GHS {item.amount.toFixed(2)}
                </span>
              </div>
            ))}
            <hr className="my-2" />
            <div className="flex justify-between items-center font-bold">
              <span>Grand Total</span>
              <span>GHS {total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
      
      {selectedStudent && feeItems.length === 0 && (
        <p className="text-sm text-muted-foreground p-4 text-center border rounded-md">No fee structure found for this student's class and the current term.</p>
      )}

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
