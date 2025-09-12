
'use client'

import React, { useState, useEffect } from 'react';
import type { TransactionCategory } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2 } from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


const formSchema = z.object({
  name: z.string().min(3, 'Category name is required.'),
  type: z.enum(['income', 'expense']),
});
type FormValues = z.infer<typeof formSchema>;


function CategoryForm({ onSubmit }: { onSubmit: SubmitHandler<FormValues> }) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: '', type: 'expense' }
    });
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Category Name</FormLabel>
                        <FormControl><Input placeholder="e.g., School Supplies" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="expense">Expense</SelectItem>
                                    <SelectItem value="income">Income</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex justify-end">
                    <Button type="submit">Add Category</Button>
                </div>
            </form>
        </Form>
    )
}

const defaultIncomeCategories = [
    { name: 'Admission fees', type: 'income' as const },
    { name: 'Book Sales (Continuing)', type: 'income' as const },
    { name: 'Canteen Fees', type: 'income' as const },
    { name: 'Miscellaneous Income', type: 'income' as const },
    { name: 'Printing & Photocopying', type: 'income' as const },
    { name: 'School Fees (Continuing)', type: 'income' as const },
    { name: 'Transport Fees', type: 'income' as const },
    { name: 'Uniform Sales (Continuing)', type: 'income' as const },
];

const defaultExpenseCategories = [
    { name: 'Salary', type: 'expense' as const },
    { name: 'Staff Deductions', type: 'expense' as const },
    { name: 'Teachers Motivation', type: 'expense' as const },
    { name: 'Canteen Supplies', type: 'expense' as const },
    { name: 'Utilities (Water/Electricity)', type: 'expense' as const },
    { name: 'Transportation (Fuel/Maintenance)', type: 'expense' as const },
    { name: 'Administrative Costs', type: 'expense' as const },
    { name: 'Repairs & Maintenance', type: 'expense' as const },
    { name: 'Printing & Stationery', type: 'expense' as const },
    { name: 'Extra-Curricular Activities', type: 'expense' as const },
    { name: 'Advertisement', type: 'expense' as const },
    { name: 'Petty Expenses', type: 'expense' as const },
    { name: 'Bank Charges', type: 'expense' as const },
];



type CategoryManagementProps = {
    categories: TransactionCategory[];
}
export function CategoryManagement({ categories }: CategoryManagementProps) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<TransactionCategory | null>(null);
    const { toast } = useToast();
    
    useEffect(() => {
        const seedDefaultCategories = async () => {
            if (categories.length === 0) {
                console.log('No categories found. Seeding default categories...');
                const batch = writeBatch(db);
                const allDefaultCategories = [...defaultIncomeCategories, ...defaultExpenseCategories];
                
                allDefaultCategories.forEach(category => {
                    const docRef = doc(collection(db, "transaction-categories"));
                    batch.set(docRef, category);
                });

                try {
                    await batch.commit();
                    toast({
                        title: "Default Categories Added",
                        description: "Standard income and expense categories have been set up for you."
                    });
                } catch (error) {
                    console.error("Failed to seed default categories:", error);
                    toast({
                        variant: "destructive",
                        title: "Setup Error",
                        description: "Could not add default categories."
                    });
                }
            }
        };

        const checkAndSeed = async () => {
            const querySnapshot = await getDocs(collection(db, "transaction-categories"));
            if (querySnapshot.empty) {
                seedDefaultCategories();
            }
        };

        checkAndSeed();
    }, []);

    const incomeCategories = categories.filter(c => c.type === 'income');
    const expenseCategories = categories.filter(c => c.type === 'expense');

    const onSubmit: SubmitHandler<FormValues> = async (values) => {
        try {
            await addDoc(collection(db, "transaction-categories"), values);
            toast({ title: "Category Added", description: "The new category has been created."});
            setIsFormOpen(false);
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: "Could not create the category." });
            console.error(e);
        }
    }

    const handleDelete = async () => {
        if (!categoryToDelete) return;
        try {
            await deleteDoc(doc(db, "transaction-categories", categoryToDelete.id));
            toast({ title: "Category Deleted" });
        } catch (e) {
             toast({ variant: "destructive", title: "Error", description: "Could not delete category." });
        } finally {
            setCategoryToDelete(null);
        }
    }


  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>Transaction Categories</CardTitle>
                <CardDescription>Manage categories for income and expenses.</CardDescription>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Category
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Category</DialogTitle>
                    </DialogHeader>
                    <CategoryForm onSubmit={onSubmit} />
                </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">
        <Card>
            <CardHeader><CardTitle>Income Categories</CardTitle></CardHeader>
            <CardContent>
                <ul className="space-y-2">
                    {incomeCategories.map(c => (
                        <li key={c.id} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted">
                            <span>{c.name}</span>
                             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCategoryToDelete(c)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
         <Card>
            <CardHeader><CardTitle>Expense Categories</CardTitle></CardHeader>
            <CardContent>
                <ul className="space-y-2">
                    {expenseCategories.map(c => (
                        <li key={c.id} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-muted">
                            <span>{c.name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCategoryToDelete(c)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
      </CardContent>
    </Card>

    <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>Deleting this category will not delete existing transactions, but it cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
