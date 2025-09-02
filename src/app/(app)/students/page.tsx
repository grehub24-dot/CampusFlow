
'use client'

import React from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, getDoc, writeBatch } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Student } from '@/types';
import { useToast } from '@/hooks/use-toast';
import type { SubmitHandler } from 'react-hook-form';
import Papa from 'papaparse';


import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Upload, Download, Users, User, UserPlus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { columns } from "./columns";
import { DataTable } from "./data-table";
import StatCard from '@/components/dashboard/stat-card';
import ClassEnrollmentChart from './class-enrollment-chart';
import { StudentForm, type FormValues } from './student-form';

export default function StudentsPage() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [schoolSettings, setSchoolSettings] = React.useState({ academicYear: 'Loading...', currentSession: 'Loading...' });
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    const settingsDocRef = doc(db, 'school-settings', 'current');
    const unsubscribeSettings = onSnapshot(settingsDocRef, (doc) => {
        if (doc.exists()) {
            setSchoolSettings(doc.data() as { academicYear: string, currentSession: string });
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

    return () => {
      unsubscribe();
      unsubscribeSettings();
    };
  }, [toast]);

  const handleAddNewStudent = () => {
    setSelectedStudent(null);
    setIsFormDialogOpen(true);
  };

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsFormDialogOpen(true);
  };
  
  const handleFormDialogClose = (open: boolean) => {
      if (!open) {
          setSelectedStudent(null);
      }
      setIsFormDialogOpen(open);
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
        const studentData = {
            name: `${values.firstName} ${values.lastName}`,
            class: values.admissionClass,
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
            // Add new student
             const settingsDocRef = doc(db, 'school-settings', 'current');
             const settingsSnap = await getDoc(settingsDocRef);
             const currentSettings = settingsSnap.exists() ? settingsSnap.data() : { academicYear: 'N/A', currentSession: 'N/A' };

            const newStudentData = {
                ...studentData,
                admissionDate: new Date().toISOString(),
                admissionTerm: currentSettings.currentSession,
                admissionYear: currentSettings.academicYear,
            };
            await addDoc(collection(db, "students"), newStudentData);
            toast({
                title: 'Student Added',
                description: `${studentData.name} has been successfully added.`,
            });
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
        id: s.id, // Ensure id is included if it's not a top-level prop in your data
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
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

            try {
                const batch = writeBatch(db);
                const settingsDocRef = doc(db, 'school-settings', 'current');
                const settingsSnap = await getDoc(settingsDocRef);
                const currentSettings = settingsSnap.exists() ? settingsSnap.data() : { academicYear: 'N/A', currentSession: 'N/A' };

                newStudents.forEach(student => {
                    const docRef = doc(collection(db, "students")); // Automatically generate ID
                    const studentData = {
                        ...student,
                        name: `${student.firstName} ${student.lastName}`,
                        admissionDate: new Date().toISOString(),
                        admissionTerm: currentSettings.currentSession,
                        admissionYear: currentSettings.academicYear,
                        status: student.status || 'Active',
                        paymentStatus: student.paymentStatus || 'Pending',
                        dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString() : new Date().toISOString(),
                    };
                    batch.set(docRef, studentData);
                });

                await batch.commit();
                toast({
                    title: "Import Successful",
                    description: `${newStudents.length} students have been successfully imported.`,
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


  const newAdmissions = students.filter(s => s.admissionTerm === schoolSettings.currentSession && s.admissionYear === schoolSettings.academicYear).length;

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
        description="View and manage all students in the system."
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
                    <div className="grid w-full max-w-sm items-center gap-1.5 py-4">
                        <Label htmlFor="csv-file">CSV File</Label>
                        <Input id="csv-file" type="file" accept=".csv" onChange={handleImport} disabled={isSubmitting} />
                        <p className="text-sm text-muted-foreground">
                            Ensure your CSV has columns: firstName, lastName, email, gender, dateOfBirth, class, guardianName, guardianPhone, etc.
                        </p>
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

             <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogClose}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNewStudent}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                  <DialogTitle>{selectedStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
                  <DialogDescription>
                    {selectedStudent ? "Update the student's details below." : "Fill out the details below to add a new student."}
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto p-1">
                   <StudentForm 
                      onSubmit={onSubmit} 
                      defaultValues={selectedStudent || undefined}
                   />
                </div>
                 {isSubmitting && !isImportDialogOpen && (
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
              </DialogContent>
            </Dialog>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard 
            title="Total Students"
            value={studentStats.total.toLocaleString()}
            icon={Users}
        />
        <StatCard 
            title="New Admissions"
            value={studentStats.newAdmissions.toLocaleString()}
            icon={UserPlus}
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

      <DataTable columns={columns} data={students} onEdit={handleEditStudent} />
    </>
  );
}
