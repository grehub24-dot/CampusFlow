
'use client'

import React from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, writeBatch, deleteDoc, query, where, getDocs, runTransaction, limit } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Student, AcademicTerm, SchoolClass, FeeStructure, Payment, AdmissionSettings, FeeItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import type { SubmitHandler } from 'react-hook-form';
import Papa from 'papaparse';


import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Upload, Download, Users, User, UserPlus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { StudentDetails } from '@/components/student-details';

import { DataTable } from "./data-table";
import StatCard from '@/components/dashboard/stat-card';
import ClassEnrollmentChart from './class-enrollment-chart';
import { StudentForm, type FormValues } from './student-form';
import PaymentForm from '../payments/payment-form';

export default function StudentsPage() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [currentTerm, setCurrentTerm] = React.useState<AcademicTerm | null>(null);
  const [classes, setClasses] = React.useState<SchoolClass[]>([]);
  const [feeStructures, setFeeStructures] = React.useState<FeeStructure[]>([]);
  const [feeItems, setFeeItems] = React.useState<FeeItem[]>([]);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = React.useState<Student | null>(null);
  const [studentsToDelete, setStudentsToDelete] = React.useState<Student[]>([]);
  const { toast } = useToast();

  React.useEffect(() => {
    const academicTermsQuery = query(collection(db, "academic-terms"), where("isCurrent", "==", true));
    const unsubscribeSettings = onSnapshot(academicTermsQuery, (snapshot) => {
        if (!snapshot.empty) {
            const termDoc = snapshot.docs[0];
            setCurrentTerm({ id: termDoc.id, ...termDoc.data() } as AcademicTerm);
        } else {
            setCurrentTerm(null);
        }
    });

    const studentsQuery = collection(db, "students");
    const unsubscribe = onSnapshot(studentsQuery, (querySnapshot) => {
      const studentsData: Student[] = [];
      querySnapshot.forEach((doc) => {
        studentsData.push({ id: doc.id, ...doc.data() } as Student);
      });
      setStudents(studentsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching students:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch student data." });
      setIsLoading(false);
    });

    const classesQuery = collection(db, "classes");
    const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
      const classesData: SchoolClass[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
      setClasses(classesData);
    });
    
    const feeStructuresQuery = query(collection(db, "fee-structures"));
    const unsubscribeFeeStructures = onSnapshot(feeStructuresQuery, (snapshot) => {
      const feeStructuresData: FeeStructure[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeStructure));
      setFeeStructures(feeStructuresData);
    });

    const feeItemsQuery = query(collection(db, "fee-items"));
    const unsubscribeFeeItems = onSnapshot(feeItemsQuery, (snapshot) => {
        setFeeItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeItem)));
    });

    const paymentsQuery = collection(db, "payments");
    const unsubscribePayments = onSnapshot(paymentsQuery, (querySnapshot) => {
      const paymentsData: Payment[] = [];
      querySnapshot.forEach((doc) => {
        paymentsData.push({ id: doc.id, ...doc.data() } as Payment);
      });
      setPayments(paymentsData);
    });

    return () => {
      unsubscribe();
      unsubscribeSettings();
      unsubscribeClasses();
      unsubscribeFeeStructures();
      unsubscribePayments();
      unsubscribeFeeItems();
    };
  }, [toast]);

  const studentsWithStatus = React.useMemo(() => {
    if (!currentTerm || feeItems.length === 0 || feeStructures.length === 0) {
      return students.map(s => ({ ...s, paymentStatus: 'Pending' as const }));
    }

    return students.map(student => {
      const structure = feeStructures.find(fs => fs.classId === student.classId && fs.academicTermId === currentTerm.id);
      if (!structure || !Array.isArray(structure.items)) {
        return { ...student, paymentStatus: 'Unpaid' as const };
      }

      const isNew = student.admissionTerm === currentTerm.session && student.admissionYear === currentTerm.academicYear;
      const termNumber = parseInt(currentTerm.session.split(' ')[0], 10);
      
      const studentPaymentsForTerm = payments.filter(p => p.studentId === student.id && p.academicYear === currentTerm.academicYear && p.term === currentTerm.session);
      const paidItemNames = new Set(studentPaymentsForTerm.flatMap(p => p.items?.map(i => i.name) || []));

      const totalDue = structure.items
        .map(item => {
          const feeItemInfo = feeItems.find(fi => fi.id === item.feeItemId);
          if (!feeItemInfo) return 0;
          
          let isApplicable = false;
          // Mandatory items are always applicable based on student status
          if (!feeItemInfo.isOptional) {
              if (isNew) {
                  if (feeItemInfo.appliesTo.includes('new')) isApplicable = true;
              } else {
                  if (termNumber === 1 && feeItemInfo.appliesTo.includes('term1')) isApplicable = true;
                  if (termNumber > 1 && feeItemInfo.appliesTo.includes('term2_3')) isApplicable = true;
              }
          }
          // Optional items are applicable if they've been paid for
          if (feeItemInfo.isOptional && paidItemNames.has(feeItemInfo.name)) {
              isApplicable = true;
          }
          
          return isApplicable ? item.amount : 0;
        })
        .reduce((total, amount) => total + amount, 0);
      
      if (totalDue === 0) {
        return { ...student, paymentStatus: 'Paid' as const };
      }

      const totalPaid = studentPaymentsForTerm.reduce((sum, p) => sum + p.amount, 0);

      let status: 'Paid' | 'Part-Payment' | 'Unpaid';
      if (totalPaid >= totalDue) {
        status = 'Paid';
      } else if (totalPaid > 0) {
        status = 'Part-Payment';
      } else {
        status = 'Unpaid';
      }
      
      return { ...student, paymentStatus: status };
    });
  }, [students, payments, feeStructures, feeItems, currentTerm]);

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsFormDialogOpen(true);
  };
  
  const handleViewDetails = (student: Student) => {
    setSelectedStudent(student);
    setIsSheetOpen(true);
  }
  
  const handlePay = (student: Student) => {
    if (currentTerm) {
        const studentForPayment = {
            ...student,
            isNewAdmission: student.admissionTerm === currentTerm.session && student.admissionYear === currentTerm.academicYear,
            currentTermNumber: parseInt(currentTerm.session.split(' ')[0], 10)
        }
        setSelectedStudent(studentForPayment);
    } else {
        setSelectedStudent(student);
    }
    setIsPaymentDialogOpen(true);
  }

  const handleDeleteStudent = (student: Student) => {
    setStudentToDelete(student);
  }
  
  const handleDeleteSelected = (selectedStudents: Student[]) => {
    setStudentsToDelete(selectedStudents);
  }

  const handleStatusChange = async (student: Student, status: 'Active' | 'Inactive' | 'Graduated' | 'Stopped') => {
    const studentDocRef = doc(db, "students", student.id);
    try {
        await updateDoc(studentDocRef, { status: status });
        toast({
            title: 'Status Updated',
            description: `${student.name}'s status has been changed to ${status}.`,
        });
    } catch (error) {
         console.error("Error updating status: ", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not update the student's status. Please try again.",
        });
    }
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "students", studentToDelete.id));
      toast({
        title: "Student Deleted",
        description: `${studentToDelete.name} has been successfully deleted.`,
      });
    } catch (error) {
      console.error("Error deleting student:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete student. Please try again.",
      });
    } finally {
        setIsSubmitting(false);
        setStudentToDelete(null);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (studentsToDelete.length === 0) return;
    setIsSubmitting(true);
    const batch = writeBatch(db);
    studentsToDelete.forEach(student => {
        const docRef = doc(db, "students", student.id);
        batch.delete(docRef);
    });

    try {
        await batch.commit();
        toast({
            title: `Deleted ${studentsToDelete.length} students`,
            description: "The selected students have been successfully deleted.",
        });
    } catch (error) {
        console.error("Error performing bulk delete: ", error);
        toast({
            variant: "destructive",
            title: "Bulk Delete Failed",
            description: "Could not delete the selected students. Please try again.",
        });
    } finally {
        setIsSubmitting(false);
        setStudentsToDelete([]);
    }
  };


  const handleFormDialogClose = (open: boolean) => {
      if (!open) {
          setSelectedStudent(null);
      }
      setIsFormDialogOpen(open);
  }

  const onSubmit: SubmitHandler<FormValues & { admissionClass: string, admissionClassCategory: string }> = async (values) => {
    setIsSubmitting(true);
    try {
        const studentData = {
            name: `${values.firstName} ${values.lastName}`,
            class: values.admissionClass,
            classCategory: values.admissionClassCategory,
            classId: values.admissionClassId,
            gender: values.gender,
            status: selectedStudent?.status || 'Active',
            paymentStatus: selectedStudent?.paymentStatus || 'Pending',
            email: values.email || `${values.firstName.toLowerCase()}.${values.lastName.toLowerCase()}@example.com`,
            dateOfBirth: values.dateOfBirth.toISOString(),
            firstName: values.firstName,
            lastName: values.lastName,
            guardianName: values.guardianName,
            guardianPhone: values.guardianPhone,
            guardianEmail: values.guardianEmail,
            previousSchool: values.previousSchool,
            notes: values.notes,
        };

        if (selectedStudent) {
            // Update existing student
            const studentDocRef = doc(db, "students", selectedStudent.id);
            await updateDoc(studentDocRef, studentData);
            toast({
                title: 'Student Updated',
                description: `${studentData.name}'s details have been successfully updated.`,
            });
        } else {
            // This form is now for editing only, adding is done via admissions.
        }
        
        setIsFormDialogOpen(false);
        setSelectedStudent(null);

    } catch (error) {
        console.error("Error saving student: ", error);
        toast({
            variant: "destructive",
            title: "Save Error",
            description: "Could not save the student details. Please try again.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleExport = () => {
    const csv = Papa.unparse(students.map(s => ({
        ...s,
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-t8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "students.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            const newStudents = results.data as any[];

            if (!currentTerm) {
                toast({
                    variant: "destructive",
                    title: "No Active Term",
                    description: "Cannot import students because no academic term is set as current.",
                });
                setIsSubmitting(false);
                return;
            }

            try {
                let importedCount = 0;
                let failedCount = 0;


                for (const student of newStudents) {
                    const studentClass = classes.find(c => c.name.trim().toLowerCase() === student.class?.trim().toLowerCase());
                    
                    if (!student.firstName || !student.lastName || !studentClass) {
                        failedCount++;
                        continue; // Skip invalid records
                    }

                    await runTransaction(db, async (transaction) => {
                        const newStudentDocRef = doc(collection(db, "students"));
                        let admissionId = student.admissionId;

                        if (!admissionId) {
                            // Format: YY-TT-9999
                            const yearPart = currentTerm.academicYear.slice(2, 4);
                            const termPart = `T${currentTerm.session.split(' ')[0]}`;
                            const prefix = `${yearPart}-${termPart}-`;

                            const termQuery = query(
                                collection(db, "students"),
                                where("admissionYear", "==", currentTerm.academicYear),
                                where("admissionTerm", "==", currentTerm.session),
                                limit(1000)
                            );
                            
                            const lastStudentSnapshot = await getDocs(termQuery);

                            let nextNumber = 1;

                            if (!lastStudentSnapshot.empty) {
                                let maxNumber = 0;
                                lastStudentSnapshot.docs.forEach(doc => {
                                    const lastAdmissionId = doc.data().admissionId as string;
                                    if (lastAdmissionId && lastAdmissionId.startsWith(prefix)) {
                                        const lastNumberMatch = lastAdmissionId.match(/(\d+)$/);
                                        if (lastNumberMatch) {
                                            const currentNum = parseInt(lastNumberMatch[0], 10);
                                            if (currentNum > maxNumber) {
                                                maxNumber = currentNum;
                                            }
                                        }
                                    }
                                });
                                nextNumber = maxNumber + 1;
                            }
                            
                            admissionId = `${prefix}${String(nextNumber).padStart(4, '0')}`;
                        }
                        
                        const studentData = {
                            admissionId: admissionId,
                            firstName: student.firstName,
                            lastName: student.lastName,
                            name: `${student.firstName} ${student.lastName}`,
                            class: studentClass.name,
                            classId: studentClass.id || '',
                            classCategory: studentClass.category || '',
                            gender: student.gender === 'Male' || student.gender === 'Female' ? student.gender : 'Other',
                            email: student.email || '',
                            guardianName: student.guardianName || '',
                            guardianPhone: student.guardianPhone || '',
                            guardianEmail: student.guardianEmail || '',
                            admissionDate: new Date().toISOString(),
                            admissionTerm: currentTerm.session,
                            admissionYear: currentTerm.academicYear,
                            status: student.status || 'Active',
                            paymentStatus: student.paymentStatus || 'Pending',
                            dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString() : new Date().toISOString(),
                        };
                        transaction.set(newStudentDocRef, studentData);
                    });
                    
                    importedCount++;
                }

                toast({
                    title: "Import Complete",
                    description: `${importedCount} students imported successfully. ${failedCount > 0 ? `${failedCount} records failed.` : ''}`,
                });
            } catch (error) {
                console.error("Error importing students: ", error);
                toast({
                    variant: "destructive",
                    title: "Import Error",
                    description: "Could not import students. Please check the file format and try again.",
                });
            } finally {
                setIsSubmitting(false);
                setIsImportDialogOpen(false);
            }
        },
        error: (error) => {
            console.error("CSV Parsing Error: ", error);
            toast({
                variant: "destructive",
                title: "File Error",
                description: "Could not parse the CSV file. Please check its format.",
            });
            setIsSubmitting(false);
        }
    });
  }


  const newAdmissions = currentTerm ? students.filter(s => s.admissionTerm === currentTerm.session && s.admissionYear === currentTerm.academicYear).length : 0;

  const studentStats = {
    total: students.length,
    male: students.filter(s => s.gender === 'Male').length,
    female: students.filter(s => s.gender === 'Female').length,
    newAdmissions: newAdmissions,
  };


  return (
    <>
      <PageHeader
        title="Students"
        description={`Manage student records for the current term (${currentTerm?.session || ''} ${currentTerm?.academicYear || ''}).`}
      >
        <div className="flex items-center gap-2">
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Import Students</DialogTitle>
                        <DialogDescription>Upload a CSV file to add multiple students at once.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="csv-file">CSV File</Label>
                            <Input id="csv-file" type="file" accept=".csv" onChange={handleImport} disabled={isSubmitting} />
                        </div>
                        <div className="text-sm">
                            <a href="/template.csv" download className="text-primary hover:underline font-medium flex items-center gap-1">
                               <Download className="h-4 w-4" /> Download Sample CSV Template
                            </a>
                             <p className="text-muted-foreground mt-1">
                                Required columns: firstName, lastName, class, gender, dateOfBirth. `admissionId` is optional.
                            </p>
                        </div>
                    </div>
                    {isSubmitting && (
                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="ml-2">Importing...</span>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
            </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard 
            title="Total Students"
            value={studentStats.total.toLocaleString()}
            icon={Users}
            color="text-indigo-500"
        />
        <StatCard 
            title="New Admissions"
            value={studentStats.newAdmissions.toLocaleString()}
            icon={UserPlus}
            color="text-green-500"
            description="This Term"
        />
        <StatCard 
            title="Male Students"
            value={studentStats.male.toLocaleString()}
            icon={User}
            color="text-blue-500"
        />
        <StatCard 
            title="Female Students"
            value={studentStats.female.toLocaleString()}
            icon={User}
            color="text-pink-500"
        />
      </div>

      <div className="mb-6">
        <ClassEnrollmentChart data={students} />
      </div>

      <DataTable 
        data={studentsWithStatus} 
        onEdit={handleEditStudent} 
        onViewDetails={handleViewDetails} 
        onDelete={handleDeleteStudent} 
        onPay={handlePay}
        onDeleteSelected={handleDeleteSelected}
        onStatusChange={handleStatusChange}
      />

       <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogClose}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Edit Student Details</DialogTitle>
              <DialogDescription>Update the information for the selected student.</DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto p-1">
              <StudentForm onSubmit={onSubmit} defaultValues={selectedStudent || undefined} classes={classes} />
            </div>
            {isSubmitting && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </DialogContent>
        </Dialog>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Student Details</SheetTitle>
          </SheetHeader>
          {selectedStudent && <StudentDetails student={selectedStudent} />}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the student's
              record from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStudentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isSubmitting}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={studentsToDelete.length > 0} onOpenChange={(open) => !open && setStudentsToDelete([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {studentsToDelete.length} selected student(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStudentsToDelete([])}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBulkDelete} disabled={isSubmitting}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


       <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Record New Payment</DialogTitle>
              <DialogDescription>Fill out the form below to record a new financial transaction.</DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto p-1">
                {currentTerm && selectedStudent && (
                  <PaymentForm 
                    students={[selectedStudent]} 
                    feeStructures={feeStructures}
                    payments={payments}
                    currentTerm={currentTerm}
                    onSuccess={() => setIsPaymentDialogOpen(false)}
                    defaultStudentId={selectedStudent.id}
                  />
                )}
            </div>
          </DialogContent>
        </Dialog>
    </>
  );
}
