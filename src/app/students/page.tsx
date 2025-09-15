
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
import { useAuth } from '@/context/auth-context';
import { logActivity } from '@/lib/activity-logger';

export default function StudentsPage() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [allTerms, setAllTerms] = React.useState<AcademicTerm[]>([]);
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
  const { user, hasPermission } = useAuth();
  
  const canCreateStudent = hasPermission('students:create');
  const canCreatePayment = hasPermission('payments:create');

  React.useEffect(() => {
    const allTermsQuery = query(collection(db, "academic-terms"));
    const unsubscribeAllTerms = onSnapshot(allTermsQuery, (snapshot) => {
        const termsData: AcademicTerm[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AcademicTerm));
        setAllTerms(termsData);
        
        const current = termsData.find(t => t.isCurrent);
        setCurrentTerm(current || null);
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

    const classesQuery = query(collection(db, "classes"));
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

    const paymentsQuery = query(collection(db, "payments"));
    const unsubscribePayments = onSnapshot(paymentsQuery, (querySnapshot) => {
      const paymentsData: Payment[] = [];
      querySnapshot.forEach((doc) => {
        paymentsData.push({ id: doc.id, ...doc.data() } as Payment);
      });
      setPayments(paymentsData);
    });

    return () => {
      unsubscribe();
      unsubscribeAllTerms();
      unsubscribeClasses();
      unsubscribeFeeStructures();
      unsubscribePayments();
      unsubscribeFeeItems();
    };
  }, [toast]);

  const studentsWithStatus = React.useMemo(() => {
    if (!currentTerm || feeItems.length === 0) {
        return students.map(s => ({
            ...s,
            paymentStatus: 'Pending' as const,
            studentType: 'Continuing' as const
        }));
    }

    const termStartDate = new Date(currentTerm.startDate);
    const termEndDate = new Date(currentTerm.endDate);

    return students.map(student => {
        const studentType = student.admissionDate && new Date(student.admissionDate) >= termStartDate && new Date(student.admissionDate) <= termEndDate
            ? 'New Admission' as const
            : 'Continuing' as const;

        if (feeStructures.length === 0) {
            return { ...student, studentType, paymentStatus: 'Unpaid' as const };
        }

        const structure = feeStructures.find(fs => fs.classId === student.classId && fs.academicTermId === currentTerm.id);
        if (!structure || !Array.isArray(structure.items)) {
            return { ...student, studentType, paymentStatus: 'Unpaid' as const };
        }

        const isNew = student.admissionTerm === currentTerm.session && student.admissionYear === currentTerm.academicYear;
        const termNumber = parseInt(currentTerm.session.split(' ')[0], 10);
        
        const studentPaymentsForTerm = payments.filter(p => p.studentId === student.id && p.academicYear === currentTerm.academicYear && p.term === currentTerm.session);
        const paidItemNames = new Set(studentPaymentsForTerm.flatMap(p => p.items?.map(i => i.name) || []));

        const totalDue = structure.items.map(item => {
            const feeItemInfo = feeItems.find(fi => fi.id === item.feeItemId);
            if (!feeItemInfo) return 0;
            
            let isApplicable = false;
            if (!feeItemInfo.isOptional) {
                const appliesToNew = feeItemInfo.appliesTo.includes('new');
                const appliesToTerm1 = feeItemInfo.appliesTo.includes('term1');
                const appliesToTerm23 = feeItemInfo.appliesTo.includes('term2_3');

                if (isNew) {
                    if (appliesToNew || (termNumber === 1 && appliesToTerm1) || (termNumber > 1 && appliesToTerm23)) {
                        isApplicable = true;
                    }
                } else {
                    if ((termNumber === 1 && appliesToTerm1) || (termNumber > 1 && appliesToTerm23)) {
                        isApplicable = true;
                    }
                }
            }
            
            if (feeItemInfo.isOptional && paidItemNames.has(feeItemInfo.name)) {
                isApplicable = true;
            }
            
            return isApplicable ? item.amount : 0;
            }).reduce((total, amount) => total + amount, 0);
        
        if (totalDue === 0) {
            return { ...student, studentType, paymentStatus: 'Paid' as const };
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
        
        return { ...student, studentType, paymentStatus: status };
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
      await logActivity(user, 'Student Deleted', `Deleted student: ${studentToDelete.name} (ID: ${studentToDelete.admissionId}).`);
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
    const studentNames = studentsToDelete.map(s => `${s.name} (ID: ${s.admissionId})`).join(', ');

    studentsToDelete.forEach(student => {
        const docRef = doc(db, "students", student.id);
        batch.delete(docRef);
    });

    try {
        await batch.commit();
        await logActivity(user, 'Bulk Student Deletion', `Deleted ${studentsToDelete.length} students: ${studentNames}.`);
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

                const allStudentsSnapshot = await getDocs(query(collection(db, "students")));

                for (const student of newStudents) {
                    const studentClass = classes.find(c => c.name.trim().toLowerCase() === student.class?.trim().toLowerCase());
                    
                    if (!student.firstName || !student.lastName || !studentClass) {
                        failedCount++;
                        continue; // Skip invalid records
                    }

                    await runTransaction(db, async (transaction) => {
                        const newStudentDocRef = doc(collection(db, "students"));
                        
                        let admissionDate;
                        if (student.admissionDate && !isNaN(new Date(student.admissionDate).getTime())) {
                            admissionDate = new Date(student.admissionDate);
                        } else {
                            admissionDate = new Date();
                        }
                        
                        let admissionTerm = allTerms.find(term => {
                            const termStart = new Date(term.startDate);
                            const termEnd = new Date(term.endDate);
                            termStart.setHours(0,0,0,0);
                            termEnd.setHours(23,59,59,999);
                            const checkDate = new Date(admissionDate);
                            checkDate.setHours(12,0,0,0);

                            return checkDate >= termStart && checkDate <= termEnd;
                        });

                        if (!admissionTerm) {
                            admissionTerm = currentTerm;
                        }

                        let admissionId = student.admissionId;
                        if (!admissionId) {
                           const prefix = "CEC-";
                           let maxNumber = 0;
                            allStudentsSnapshot.forEach(doc => {
                                const lastAdmissionId = doc.data().admissionId as string;
                                if (lastAdmissionId && lastAdmissionId.startsWith(prefix)) {
                                    const lastNumberMatch = lastAdmissionId.match(/(\\d+)$/);
                                    if (lastNumberMatch) {
                                        const currentNum = parseInt(lastNumberMatch[0], 10);
                                        if (currentNum > maxNumber) {
                                            maxNumber = currentNum;
                                        }
                                    }
                                }
                            });
                            const nextNumber = maxNumber + 1 + importedCount;
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
                            admissionDate: admissionDate.toISOString(),
                            admissionTerm: admissionTerm.session,
                            admissionYear: admissionTerm.academicYear,
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


  const newAdmissionsCount = React.useMemo(() => {
    if (!currentTerm) return 0;
    
    const termStartDate = new Date(currentTerm.startDate);
    const termEndDate = new Date(currentTerm.endDate);
    
    return students.filter(s => {
      if (!s.admissionDate) return false;
      const admissionDate = new Date(s.admissionDate);
      return admissionDate >= termStartDate && admissionDate <= termEndDate;
    }).length;
  }, [students, currentTerm]);


  const studentStats = {
    total: students.length,
    male: students.filter(s => s.gender === 'Male').length,
    female: students.filter(s => s.gender === 'Female').length,
    newAdmissions: newAdmissionsCount,
    continuing: students.length - newAdmissionsCount,
  };


  return (
    <>
      <PageHeader
        title="Students"
        description={`Manage student records for the current term (${currentTerm?.session || ''} ${currentTerm?.academicYear || ''}).`}
      >
        <div className="flex items-center gap-2">
            {canCreateStudent && (
              <>
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
                                    Required columns: firstName, lastName, class, gender, dateOfBirth, admissionDate. `admissionId` is optional.
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
              </>
            )}
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 mb-6">
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
            title="Continuing Students"
            value={studentStats.continuing.toLocaleString()}
            icon={Users}
            color="text-blue-500"
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
        canCreatePayment={canCreatePayment}
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
              This action cannot be undone. This will permanently delete the ${studentsToDelete.length} selected student(s).
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

    

    

    

    