
'use client'

import React from 'react';
import { collection, onSnapshot } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Student } from '@/types';
import { useToast } from '@/hooks/use-toast';

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Upload, Download } from "lucide-react";

import { columns } from "./columns";
import { DataTable } from "./data-table";

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
      <DataTable columns={columns} data={students} />
    </>
  );
}
