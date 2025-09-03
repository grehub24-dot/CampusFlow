
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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

interface Props {
  students: Student[];
  feeStructures: FeeStructure[];
  currentTerm: AcademicTerm;
  onSuccess: () => void;
}

export default function PaymentForm({ students, feeStructures, currentTerm, onSuccess }: Props) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [total, setTotal] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const selectedStudent = useMemo(
    () => students.find(s => s.id === selectedStudentId),
    [students, selectedStudentId]
  );

  const matchingStructure = useMemo(() => {
    if (!selectedStudent || !selectedStudent.classId) return null;
    return feeStructures.find(
      fs =>
        fs.classId === selectedStudent.classId &&
        fs.academicTermId === currentTerm.id
    );
  }, [feeStructures, selectedStudent, currentTerm]);

  const displayItems: FeeItem[] = useMemo(() => {
    if (!matchingStructure) return [];
    
    const allItems: FeeItem[] = [];
    if (matchingStructure.schoolFees) allItems.push({ name: 'School Fees', amount: matchingStructure.schoolFees });
    if (matchingStructure.booksFee) allItems.push({ name: 'Books Fee', amount: matchingStructure.booksFee });
    if (matchingStructure.uniformFee) allItems.push({ name: 'Uniform Fee', amount: matchingStructure.uniformFee });
    if (matchingStructure.printingFee) allItems.push({ name: 'Printing Fee', amount: matchingStructure.printingFee });
    if (matchingStructure.others) allItems.push({ name: 'Others', amount: matchingStructure.others });
    
    return allItems;
  }, [matchingStructure]);

  useEffect(() => {
    if (!displayItems.length) {
      setCheckedItems({});
      setTotal(0);
      return;
    }

    const initial: Record<string, boolean> = {};
    let initialTotal = 0;
    displayItems.forEach(item => {
      initial[item.name] = true;
      initialTotal += item.amount;
    });
    setCheckedItems(initial);
    setTotal(initialTotal);
  }, [displayItems]);

  const handleToggle = (itemName: string, amount: number) => {
    const isChecked = checkedItems[itemName];
    setCheckedItems(prev => ({ ...prev, [itemName]: !isChecked }));
    setTotal(prev => isChecked ? prev - amount : prev + amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setIsSubmitting(true);

    try {
      const itemsToPay = displayItems
        .filter(item => checkedItems[item.name])
        .map(item => ({...item, included: true }));

      const payload = {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        amount: total,
        date: new Date().toISOString(),
        status: 'Paid',
        paymentMethod: 'Cash', // Defaulting, can be changed to a form field
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
         <Select onValueChange={setSelectedStudentId} value={selectedStudentId}>
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

      {displayItems.length > 0 && (
        <div>
          <h3 className="font-medium mb-2">Fee Items</h3>
          <div className="space-y-2 border rounded-md p-4">
            {displayItems.map(item => (
              <div
                key={item.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`fee-item-${item.name}`}
                    checked={checkedItems[item.name] || false}
                    onCheckedChange={() => handleToggle(item.name, item.amount)}
                  />
                  <Label htmlFor={`fee-item-${item.name}`} className="text-sm font-normal cursor-pointer">
                    {item.name}
                  </Label>
                </div>
                <span className="text-sm">GHS {item.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {selectedStudent && displayItems.length === 0 && (
        <p className="text-sm text-muted-foreground p-4 text-center border rounded-md">No fee structure found for this student's class and the current term.</p>
      )}


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
