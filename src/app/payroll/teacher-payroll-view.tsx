
'use client'

import React from 'react';
import type { PayrollRun, Payslip } from '@/types';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { getTeacherPayslipColumns } from './teacher-payslip-columns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PayslipDetails } from './payslip';

type TeacherPayrollViewProps = {
    payrollRuns: PayrollRun[];
    isLoading: boolean;
    teacherId: string;
}

export function TeacherPayrollView({ payrollRuns, isLoading, teacherId }: TeacherPayrollViewProps) {
    const [selectedPayslip, setSelectedPayslip] = React.useState<Payslip | null>(null);

    const myPayslips = React.useMemo(() => {
        if (!payrollRuns) return [];
        return payrollRuns
            .flatMap(run => run.payslips)
            .filter(payslip => payslip.id === teacherId);
    }, [payrollRuns, teacherId]);

    const columns = React.useMemo(() => getTeacherPayslipColumns({ onView: setSelectedPayslip }), []);
    const table = useReactTable({
        data: myPayslips,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <>
            <PageHeader
                title="My Payroll"
                description="View your personal payslip history."
            />
            <Card>
                <CardHeader>
                    <CardTitle>My Payslips</CardTitle>
                    <CardDescription>A list of all your processed payslips.</CardDescription>
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
                                    <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No payslips found for you.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!selectedPayslip} onOpenChange={(isOpen) => !isOpen && setSelectedPayslip(null)}>
                <DialogContent className="sm:max-w-2xl">
                     <DialogHeader>
                        <DialogTitle>Payslip for {selectedPayslip?.staffName}</DialogTitle>
                        <DialogDescription>Period: {selectedPayslip?.period}</DialogDescription>
                    </DialogHeader>
                    {selectedPayslip && <PayslipDetails payslip={selectedPayslip} />}
                </DialogContent>
            </Dialog>
        </>
    )
}
