
'use client'

import React from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { FeeItem } from '@/types';
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

import { FeeItemForm, type FormValues } from './fee-items-form';
import { Badge } from '@/components/ui/badge';

const appliesToLabels: Record<string, string> = {
    'new': 'New Admission',
    'term1': 'Term 1',
    'term2_3': 'Term 2 & 3',
}


export function FeeItemsSettings() {
    const [feeItems, setFeeItems] = React.useState<FeeItem[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
    const [selectedFeeItem, setSelectedFeeItem] = React.useState<FeeItem | null>(null);
    const [itemToDelete, setItemToDelete] = React.useState<FeeItem | null>(null);
    const { toast } = useToast();

    React.useEffect(() => {
        const q = query(collection(db, "fee-items"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const data: FeeItem[] = [];
            querySnapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() } as FeeItem);
            });
            setFeeItems(data);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching fee items:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch fee items." });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);

    const handleAddNew = () => {
        setSelectedFeeItem(null);
        setIsFormDialogOpen(true);
    };

    const handleEdit = (item: FeeItem) => {
        setSelectedFeeItem(item);
        setIsFormDialogOpen(true);
    };

    const handleDelete = (item: FeeItem) => {
        setItemToDelete(item);
    }
    
    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        setIsSubmitting(true);
        try {
            await deleteDoc(doc(db, "fee-items", itemToDelete.id));
            toast({
                title: "Fee Item Deleted",
                description: `${itemToDelete.name} has been successfully deleted.`,
            });
        } catch (error) {
            console.error("Error deleting fee item:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not delete fee item." });
        } finally {
            setIsSubmitting(false);
            setItemToDelete(null);
        }
    }

    const handleFormDialogClose = (open: boolean) => {
        if (!open) {
            setSelectedFeeItem(null);
        }
        setIsFormDialogOpen(open);
    }

    const onSubmit: SubmitHandler<FormValues> = async (values) => {
        setIsSubmitting(true);
        try {
            if (selectedFeeItem) {
                const docRef = doc(db, "fee-items", selectedFeeItem.id);
                await updateDoc(docRef, values);
                toast({ title: 'Fee Item Updated', description: 'The fee item has been successfully updated.' });
            } else {
                await addDoc(collection(db, "fee-items"), values);
                toast({ title: 'Fee Item Added', description: 'The new fee item has been successfully added.' });
            }
            setIsFormDialogOpen(false);
            setSelectedFeeItem(null);
        } catch (error) {
            console.error("Error saving fee item: ", error);
            toast({ variant: "destructive", title: "Save Error", description: "Could not save the fee item." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Fee Items Management</CardTitle>
                        <CardDescription>Define the individual components that make up your fee structures.</CardDescription>
                    </div>
                    <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogClose}>
                        <DialogTrigger asChild>
                            <Button onClick={handleAddNew}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Fee Item
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>{selectedFeeItem ? 'Edit' : 'Add New'} Fee Item</DialogTitle>
                            </DialogHeader>
                            <div className="p-1">
                               <FeeItemForm 
                                  onSubmit={onSubmit} 
                                  defaultValues={selectedFeeItem || undefined}
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
                                <TableHead>Name</TableHead>
                                <TableHead>Applies To</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                    </TableCell>
                                </TableRow>
                            ) : feeItems.length > 0 ? (
                                feeItems.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {item.appliesTo.map(val => <Badge key={val} variant="secondary">{appliesToLabels[val]}</Badge>)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={item.isOptional ? 'outline' : 'default'}>
                                                {item.isOptional ? 'Optional' : 'Mandatory'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0" disabled={isSubmitting}>
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEdit(item)}>Edit</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(item)} className="text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No fee items found. Please add one to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
             <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the fee item.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete} disabled={isSubmitting}>Delete</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
