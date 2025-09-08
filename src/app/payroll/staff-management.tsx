
'use client'

import React from 'react';
import type { StaffMember } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { doc, addDoc, updateDoc, deleteDoc, collection } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { SubmitHandler } from 'react-hook-form';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, PlusCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStaffColumns } from './staff-columns';
import { StaffForm, FormValues } from './staff-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

type StaffManagementProps = {
    staff: StaffMember[];
    isLoading: boolean;
}

export function StaffManagement({ staff, isLoading }: StaffManagementProps) {
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
    const [selectedStaff, setSelectedStaff] = React.useState<StaffMember | null>(null);
    const [staffToDelete, setStaffToDelete] = React.useState<StaffMember | null>(null);
    const { toast } = useToast();

    const handleAddNew = () => {
        setSelectedStaff(null);
        setIsFormDialogOpen(true);
    };

    const handleEdit = (staffMember: StaffMember) => {
        setSelectedStaff(staffMember);
        setIsFormDialogOpen(true);
    };

    const handleDelete = (staffMember: StaffMember) => {
        setStaffToDelete(staffMember);
    }
    
    const handleConfirmDelete = async () => {
        if (!staffToDelete) return;
        setIsSubmitting(true);
        try {
            await deleteDoc(doc(db, "staff", staffToDelete.id));
            toast({ title: "Staff Deleted", description: `${staffToDelete.name} has been removed.` });
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Could not delete staff member." });
        } finally {
            setIsSubmitting(false);
            setStaffToDelete(null);
        }
    }
    
    const calculatePayrollForEmployee = (employee: { grossSalary: number, deductions?: {name: string, amount: number}[] }) => {
        const gross = employee.grossSalary;
        const ssnitEmployee = gross * 0.055;
        const taxableIncome = gross - ssnitEmployee;
        
        let incomeTax = 0;
        if (taxableIncome > 3000) incomeTax = (taxableIncome - 3000) * 0.25;
        else if (taxableIncome > 1000) incomeTax = (taxableIncome - 1000) * 0.175;
        else if (taxableIncome > 500) incomeTax = (taxableIncome - 500) * 0.1;

        const customDeductionsTotal = employee.deductions?.reduce((acc, d) => acc + d.amount, 0) || 0;
        const totalDeductions = ssnitEmployee + incomeTax + customDeductionsTotal;
        const netSalary = gross - totalDeductions;

        return {
            ssnitEmployee,
            taxableIncome,
            incomeTax,
            netSalary,
        };
    };

    const onSubmit: SubmitHandler<FormValues> = async (values) => {
        setIsSubmitting(true);
        try {
            const payrollCalculations = calculatePayrollForEmployee(values);
            const data = { ...values, ...payrollCalculations };

            if (selectedStaff) {
                const staffDocRef = doc(db, "staff", selectedStaff.id);
                await updateDoc(staffDocRef, data);
                toast({ title: 'Staff Updated', description: 'The staff member details have been updated.' });
            } else {
                await addDoc(collection(db, "staff"), data);
                toast({ title: 'Staff Added', description: 'New staff member has been added.' });
            }
            
            setIsFormDialogOpen(false);
            setSelectedStaff(null);

        } catch (error) {
            toast({ variant: "destructive", title: "Save Error", description: "Could not save the staff details." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const columns = React.useMemo(() => getStaffColumns({ onEdit: handleEdit, onDelete: handleDelete }), []);
    const table = useReactTable({
        data: staff,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>All Staff</CardTitle>
                            <CardDescription>Manage all employees in the school.</CardDescription>
                        </div>
                        <Button onClick={handleAddNew}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Staff
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={columns.length} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow key={row.id}>
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No staff found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedStaff ? 'Edit' : 'Add New'} Staff Member</DialogTitle>
                    </DialogHeader>
                    <div className="p-1">
                       <StaffForm onSubmit={onSubmit} defaultValues={selectedStaff || undefined} />
                    </div>
                    {isSubmitting && (
                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!staffToDelete} onOpenChange={(open) => !open && setStaffToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the staff member. This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} disabled={isSubmitting}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
