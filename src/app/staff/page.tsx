
'use client'

import React from 'react';
import type { StaffMember, PayrollSettings } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { doc, addDoc, updateDoc, deleteDoc, collection, onSnapshot, query } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { SubmitHandler } from 'react-hook-form';
import { logActivity } from '@/lib/activity-logger';
import { v4 as uuidv4 } from 'uuid';

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
    const [payrollSettings, setPayrollSettings] = React.useState<PayrollSettings | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
    const [selectedStaff, setSelectedStaff] = React.useState<StaffMember | null>(null);
    const [staffToDelete, setStaffToDelete] = React.useState<StaffMember | null>(null);
    const { toast } = useToast();
    const { user, hasPermission } = useAuth();
    const canUpdate = hasPermission('staff:update');
    const canDelete = hasPermission('staff:delete');
    const canManageStaff = canUpdate || canDelete;
    const canCreateStaff = hasPermission('staff:create');

    React.useEffect(() => {
        const staffQuery = query(collection(db, "staff"));
        const unsubscribeStaff = onSnapshot(staffQuery, (snapshot) => {
            setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember)));
            setIsLoading(false);
        });
        
        const payrollSettingsRef = doc(db, "settings", "payroll");
        const unsubscribePayrollSettings = onSnapshot(payrollSettingsRef, (doc) => {
            if (doc.exists()) {
                setPayrollSettings(doc.data() as PayrollSettings);
            }
        });

        return () => {
            unsubscribeStaff();
            unsubscribePayrollSettings();
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
        const ssnitEmployeeRate = payrollSettings ? payrollSettings.ssnitEmployeeRate / 100 : 0.055;
        const ssnitEmployerRate = payrollSettings ? payrollSettings.ssnitEmployerRate / 100 : 0.13;
        
        const ssnitEmployee = gross * ssnitEmployeeRate;
        const ssnitEmployer = gross * ssnitEmployerRate;
        const taxableIncome = gross - ssnitEmployee;
        
        let incomeTax = 0;
        if (payrollSettings?.payeTaxBrackets) {
             let remainingIncome = taxableIncome;
             let calculatedTax = 0;
             const sortedBrackets = [...payrollSettings.payeTaxBrackets].sort((a, b) => a.from - b.from);
             
             for (const bracket of sortedBrackets) {
                if (remainingIncome <= 0) break;
                
                const bracketMax = bracket.to ?? Infinity;
                const incomeInBracket = Math.min(remainingIncome, bracketMax - bracket.from);

                if (taxableIncome > bracket.from) {
                    const applicableIncome = Math.min(taxableIncome, bracketMax) - bracket.from;
                    if (applicableIncome > 0) {
                         let taxablePortion = Math.min(applicableIncome, remainingIncome);
                         calculatedTax += taxablePortion * (bracket.rate / 100);
                         remainingIncome -= taxablePortion;
                    }
                }
             }
             incomeTax = calculatedTax;
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
                const payrollId = `STAFF-${uuidv4().substring(0, 8).toUpperCase()}`;
                await addDoc(collection(db, "staff"), { ...data, payrollId });
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
    
    const columns = React.useMemo(() => getStaffColumns({ onEdit: canUpdate ? handleEdit : () => {}, onDelete: canDelete ? handleDelete: () => {}, canManage: canManageStaff }), [canUpdate, canDelete, canManageStaff]);
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
                {canCreateStaff && (
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

    