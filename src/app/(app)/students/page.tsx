
'use client'

import React from 'react';
import { collection, onSnapshot } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Student } from '@/types';
import { useToast } from '@/hooks/use-toast';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Upload, Download, Users, User, BookOpen, UserPlus } from "lucide-react";

import { columns } from "./columns";
import { DataTable } from "./data-table";
import StatCard from '@/components/dashboard/stat-card';
import ClassEnrollmentChart from './class-enrollment-chart';

export default function StudentsPage() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
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

    return () => unsubscribe();
  }, [toast]);

  const currentYear = new Date().getFullYear();
  const newAdmissions = students.filter(s => new Date(s.admissionDate).getFullYear() === currentYear).length;

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
            <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import
            </Button>
            <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
            </Button>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Student
            </Button>
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
            description="This calendar year"
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

      <DataTable columns={columns} data={students} />
    </>
  );
}
