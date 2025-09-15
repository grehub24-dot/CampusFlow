
'use client'

import React from 'react';
import type { StaffMember } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { doc, addDoc, updateDoc, deleteDoc, collection, onSnapshot, query } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { SubmitHandler } from 'react-hook-form';
import { logActivity } from '@/lib/activity-logger';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, PlusCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStaffColumns } from './columns';
import { StaffForm, FormValues } from './staff-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { PageHeader } from '@/components/page-header';
import { useAuth } from '@/context/auth-context';

export default function StaffPage() {
    const [staff, setStaff] = React.useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
    const [selectedStaff, setSelectedStaff] = React.useState<StaffMember | null>(null);
    const [staffToDelete, setStaffToDelete] = React.useState<StaffMember | null>(null);
    const { toast } = useToast();
    const { user } = useAuth();
    const canManageStaff = user?.role === 'Admin';
    
    React.useEffect(() => {
        const staffQuery = query(collection(db, "staff"));
        const unsubscribeStaff = onSnapshot(staffQuery, (snapshot) => {
            setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember)));
            setIsLoading(false);
        });

        return () => {
            unsubscribeStaff();
        };
  }, []);


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
            await logActivity(user, 'Staff Deleted', `Deleted staff member: ${staffToDelete.name}`);
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
        const ssnitEmployer = gross * 0.13;
        const taxableIncome = gross - ssnitEmployee;
        
        let incomeTax = 0;
        // Simplified tax calculation for annual income
        if (taxableIncome > 5880) {
            if (taxableIncome <= 7200) incomeTax = (taxableIncome - 5880) * 0.05;
            else if (taxableIncome <= 8760) incomeTax = 66 + (taxableIncome - 7200) * 0.10;
            else if (taxableIncome <= 36000) incomeTax = 222 + (taxableIncome - 8760) * 0.175;
            else if (taxableIncome <= 197900) incomeTax = 4989 + (taxableIncome - 36000) * 0.25;
            else if (taxableIncome <= 600000) incomeTax = 45464 + (taxableIncome - 197900) * 0.30;
            else incomeTax = 166094 + (taxableIncome - 600000) * 0.35;
        }

        const customDeductionsTotal = employee.deductions?.reduce((acc, d) => acc + d.amount, 0) || 0;
        const totalDeductions = ssnitEmployee + incomeTax + customDeductionsTotal;
        const netSalary = gross - totalDeductions;

        return {
            ssnitEmployee,
            ssnitEmployer,
            taxableIncome,
            incomeTax,
            netSalary,
        };
    };

    const onSubmit: SubmitHandler<FormValues> = async (values) => {
        setIsSubmitting(true);
        try {
            const payrollCalculations = calculatePayrollForEmployee(values);
            const data: Partial<StaffMember> & { employmentDate?: string } = {
                ...values,
                ...payrollCalculations,
                employmentDate: values.employmentDate?.toISOString(),
            };

            if (selectedStaff) {
                // Update
                const staffDocRef = doc(db, "staff", selectedStaff.id);
                await updateDoc(staffDocRef, data);
                await logActivity(user, 'Staff Updated', `Updated details for ${values.name}`);
                toast({ title: 'Staff Updated', description: 'The staff member details have been updated.' });

            } else {
                // Create
                await addDoc(collection(db, "staff"), data);
                await logActivity(user, 'Staff Added', `Added new staff member: ${values.name}`);
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
    
    const columns = React.useMemo(() => getStaffColumns({ onEdit: handleEdit, onDelete: handleDelete, canManage: canManageStaff }), [canManageStaff]);
    const table = useReactTable({
        data: staff,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <>
            <PageHeader
                title="Staff Management"
                description="Manage all employees in the school."
            >
                {canManageStaff && (
                    <Button onClick={handleAddNew}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Staff
                    </Button>
                )}
            </PageHeader>
            <Card>
                <CardHeader>
                    <CardTitle>All Staff</CardTitle>
                    <CardDescription>A list of all staff members in the system.</CardDescription>
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
