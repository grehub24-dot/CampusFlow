
'use client'

import React from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { FeeStructure, SchoolClass, AcademicTerm, FeeItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import type { SubmitHandler } from 'react-hook-form';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, PlusCircle, MoreHorizontal, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

import { FeeStructureForm, type FormValues } from './fee-structure-form';

export function FeeStructureSettings() {
    const [feeStructures, setFeeStructures] = React.useState<FeeStructure[]>([]);
    const [classes, setClasses] = React.useState<SchoolClass[]>([]);
    const [terms, setTerms] = React.useState<AcademicTerm[]>([]);
    const [feeItems, setFeeItems] = React.useState<FeeItem[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
    const [selectedFeeStructure, setSelectedFeeStructure] = React.useState<FeeStructure | null>(null);
    const [structureToDelete, setStructureToDelete] = React.useState<FeeStructure | null>(null);
    const { toast } = useToast();

    React.useEffect(() => {
        const feeStructuresQuery = query(collection(db, "fee-structures"));
        const unsubscribeFeeStructures = onSnapshot(feeStructuresQuery, (snapshot) => {
            const data: FeeStructure[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeStructure));
            setFeeStructures(data);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching fee structures:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch fee structures." });
            setIsLoading(false);
        });

        const classesQuery = query(collection(db, "classes"));
        const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
            const data: SchoolClass[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
            setClasses(data);
        });

        const termsQuery = query(collection(db, "academic-terms"));
        const unsubscribeTerms = onSnapshot(termsQuery, (snapshot) => {
            const data: AcademicTerm[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AcademicTerm));
            setTerms(data);
        });
        
        const feeItemsQuery = query(collection(db, "fee-items"));
        const unsubscribeFeeItems = onSnapshot(feeItemsQuery, (snapshot) => {
            const data: FeeItem[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeItem));
            setFeeItems(data);
        });

        return () => {
            unsubscribeFeeStructures();
            unsubscribeClasses();
            unsubscribeTerms();
            unsubscribeFeeItems();
        };
    }, [toast]);
    
    const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || 'N/A';
    const getTermName = (termId: string) => {
        const term = terms.find(t => t.id === termId);
        return term ? `${term.session} (${term.academicYear})` : 'N/A';
    }


    const handleAddNew = () => {
        setSelectedFeeStructure(null);
        setIsFormDialogOpen(true);
    };

    const handleEdit = (structure: FeeStructure) => {
        setSelectedFeeStructure(structure);
        setIsFormDialogOpen(true);
    };
    
    const handleDelete = (structure: FeeStructure) => {
        setStructureToDelete(structure);
    }

    const handleConfirmDelete = async () => {
        if (!structureToDelete) return;
        setIsSubmitting(true);
        try {
            await deleteDoc(doc(db, "fee-structures", structureToDelete.id));
            toast({ title: "Fee Structure Deleted", description: "The fee structure has been successfully deleted." });
        } catch (error) {
            console.error("Error deleting fee structure:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not delete the fee structure." });
        } finally {
            setIsSubmitting(false);
            setStructureToDelete(null);
        }
    }
    
    const calculateTotal = (items: { feeItemId: string, amount: number }[]) => {
        if (!Array.isArray(items)) return 0;
        return items.reduce((acc, item) => acc + (item.amount || 0), 0);
    }

    const onSubmit: SubmitHandler<FormValues> = async (values) => {
        setIsSubmitting(true);
        try {
            const feeItemsData = values.items.map(item => ({
                feeItemId: item.feeItemId,
                amount: item.amount || 0
            }));

            const data = {
                classId: values.classId,
                academicTermId: values.academicTermId,
                items: feeItemsData
            };

            if (selectedFeeStructure) {
                const docRef = doc(db, "fee-structures", selectedFeeStructure.id);
                await updateDoc(docRef, data);
                toast({ title: 'Fee Structure Updated', description: 'The fee structure has been successfully updated.' });
            } else {
                await addDoc(collection(db, "fee-structures"), data);
                toast({ title: 'Fee Structure Added', description: 'The new fee structure has been successfully added.' });
            }
            setIsFormDialogOpen(false);
            setSelectedFeeStructure(null);
        } catch (error) {
            console.error("Error saving fee structure: ", error);
            toast({ variant: "destructive", title: "Save Error", description: "Could not save the fee structure." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Fee Structure Management</CardTitle>
                        <CardDescription>Define fee amounts for different classes and academic terms.</CardDescription>
                    </div>
                     <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={handleAddNew}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Fee Structure
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[800px]">
                            <DialogHeader>
                                <DialogTitle>{selectedFeeStructure ? 'Edit' : 'Add'} Fee Structure</DialogTitle>
                            </DialogHeader>
                            <div className="max-h-[70vh] overflow-y-auto p-1">
                               <FeeStructureForm 
                                  onSubmit={onSubmit} 
                                  defaultValues={selectedFeeStructure || undefined}
                                  classes={classes}
                                  terms={terms}
                                  feeItems={feeItems}
                               />
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
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Class</TableHead>
                                <TableHead>Term</TableHead>
                                <TableHead className="text-right">Total Amount</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                            ) : feeStructures.length > 0 ? (
                                feeStructures.map(structure => (
                                    <TableRow key={structure.id}>
                                        <TableCell>{getClassName(structure.classId)}</TableCell>
                                        <TableCell>{getTermName(structure.academicTermId)}</TableCell>
                                        <TableCell className="text-right">GHS {calculateTotal(structure.items).toLocaleString()}</TableCell>
                                        <TableCell className="text-right">
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0" disabled={isSubmitting}>
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEdit(structure)}>Edit</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(structure)} className="text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={4} className="h-24 text-center">No fee structures found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
        <AlertDialog open={!!structureToDelete} onOpenChange={(open) => !open && setStructureToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete the fee structure. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setStructureToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete} disabled={isSubmitting}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
    );
}
