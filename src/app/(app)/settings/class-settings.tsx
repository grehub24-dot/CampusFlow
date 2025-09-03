
'use client'

import React from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { SchoolClass } from '@/types';
import { useToast } from '@/hooks/use-toast';
import type { SubmitHandler } from 'react-hook-form';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, PlusCircle, MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

import { ClassForm, type FormValues } from './class-settings-form';

const categoryOrder = ['Pre-school', 'Primary', 'Junior High School'];

export function ClassSettings() {
    const [classes, setClasses] = React.useState<SchoolClass[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
    const [selectedClass, setSelectedClass] = React.useState<SchoolClass | null>(null);
    const [classToDelete, setClassToDelete] = React.useState<SchoolClass | null>(null);
    const { toast } = useToast();

    React.useEffect(() => {
        const q = query(collection(db, "classes"), orderBy("name"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const classesData: SchoolClass[] = [];
            querySnapshot.forEach((doc) => {
                classesData.push({ id: doc.id, ...doc.data() } as SchoolClass);
            });
            setClasses(classesData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching classes:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch classes." });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);

    const handleAddNew = () => {
        setSelectedClass(null);
        setIsFormDialogOpen(true);
    };

    const handleEdit = (schoolClass: SchoolClass) => {
        setSelectedClass(schoolClass);
        setIsFormDialogOpen(true);
    };

    const handleDelete = (schoolClass: SchoolClass) => {
        setClassToDelete(schoolClass);
    }
    
    const handleConfirmDelete = async () => {
        if (!classToDelete) return;
        setIsSubmitting(true);
        try {
            await deleteDoc(doc(db, "classes", classToDelete.id));
            toast({
                title: "Class Deleted",
                description: `${classToDelete.name} has been successfully deleted.`,
            });
        } catch (error) {
            console.error("Error deleting class:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not delete class." });
        } finally {
            setIsSubmitting(false);
            setClassToDelete(null);
        }
    }

    const handleFormDialogClose = (open: boolean) => {
        if (!open) {
            setSelectedClass(null);
        }
        setIsFormDialogOpen(open);
    }

    const onSubmit: SubmitHandler<FormValues> = async (values) => {
        setIsSubmitting(true);
        try {
            if (selectedClass) {
                const classDocRef = doc(db, "classes", selectedClass.id);
                await updateDoc(classDocRef, values);
                toast({ title: 'Class Updated', description: 'The class has been successfully updated.' });
            } else {
                await addDoc(collection(db, "classes"), values);
                toast({ title: 'Class Added', description: 'The new class has been successfully added.' });
            }
            setIsFormDialogOpen(false);
            setSelectedClass(null);
        } catch (error) {
            console.error("Error saving class: ", error);
            toast({ variant: "destructive", title: "Save Error", description: "Could not save the class details." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const groupedClasses = classes.reduce((acc, currentClass) => {
        const category = currentClass.category;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(currentClass);
        return acc;
    }, {} as Record<string, SchoolClass[]>);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Class Management</CardTitle>
                        <CardDescription>Manage all classes and categories for the school.</CardDescription>
                    </div>
                    <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogClose}>
                        <DialogTrigger asChild>
                            <Button onClick={handleAddNew}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add New Class
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>{selectedClass ? 'Edit Class' : 'Add New Class'}</DialogTitle>
                                <DialogDescription>{selectedClass ? "Update the class details." : "Fill out the details below to add a new class."}</DialogDescription>
                            </DialogHeader>
                            <div className="p-1">
                               <ClassForm onSubmit={onSubmit} defaultValues={selectedClass || undefined} />
                            </div>
                            {isSubmitting && (
                                <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                     <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : categoryOrder.map(category => (
                    groupedClasses[category] && (
                        <div key={category} className="mb-6">
                            <h3 className="text-lg font-semibold mb-2 border-b pb-1">{category}</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {groupedClasses[category].map(cls => (
                                     <Card key={cls.id} className="flex items-center justify-between p-3">
                                        <span className="font-medium text-sm">{cls.name}</span>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(cls)}>Edit</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDelete(cls)} className="text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                     </Card>
                                ))}
                            </div>
                        </div>
                    )
                ))}
                {!isLoading && classes.length === 0 && (
                     <p className="text-center text-muted-foreground py-12">No classes found. Add one to get started.</p>
                )}
            </CardContent>

             <AlertDialog open={!!classToDelete} onOpenChange={(open) => !open && setClassToDelete(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the class.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setClassToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete} disabled={isSubmitting}>Delete</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
