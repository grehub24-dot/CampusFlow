
'use client'

import React from 'react';
import type { PayrollRun, Payslip } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { getPayrollHistoryColumns } from './payroll-history-columns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PayslipDetails } from './payslip';

type PayrollHistoryProps = {
    payrollRuns: PayrollRun[];
    isLoading: boolean;
}

export function PayrollHistory({ payrollRuns, isLoading }: PayrollHistoryProps) {
    const [selectedRun, setSelectedRun] = React.useState<PayrollRun | null>(null);

    const columns = React.useMemo(() => getPayrollHistoryColumns({ onView: setSelectedRun }), []);
    const table = useReactTable({
        data: payrollRuns,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Payroll Run History</CardTitle>
                    <CardDescription>A log of all processed payrolls.</CardDescription>
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
                                    <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No payroll history found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!selectedRun} onOpenChange={(isOpen) => !isOpen && setSelectedRun(null)}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Payroll Details for {selectedRun?.period}</DialogTitle>
                        <DialogDescription>
                            Total Payroll: GHS {selectedRun?.totalAmount.toLocaleString()} | Employees: {selectedRun?.employeeCount}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto">
                        <PayslipList payslips={selectedRun?.payslips || []} />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

function PayslipList({ payslips }: { payslips: Payslip[] }) {
    const [selectedPayslip, setSelectedPayslip] = React.useState<Payslip | null>(null);

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Staff Name</TableHead>
                        <TableHead>Gross Salary</TableHead>
                        <TableHead>Net Salary</TableHead>
                        <TableHead></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {payslips.map(p => (
                        <TableRow key={p.id}>
                            <TableCell>{p.staffName}</TableCell>
                            <TableCell>GHS {p.grossSalary.toLocaleString()}</TableCell>
                            <TableCell>GHS {p.netSalary.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => setSelectedPayslip(p)}>View Payslip</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            
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
