
'use client'

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Student, Payment, AcademicTerm, FinancialSummaryItem } from '@/types';
import { useToast } from '@/hooks/use-toast';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import StatCard from '@/components/dashboard/stat-card';
import { DollarSign, UserPlus } from 'lucide-react';


const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "GHS",
    }).format(amount)
}

export default function FinancialSummaryPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [currentTerm, setCurrentTerm] = useState<AcademicTerm | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const studentsQuery = query(collection(db, "students"));
        const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
            setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
        });
        
        const paymentsQuery = query(collection(db, "payments"));
        const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
            setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
        });

        const academicTermsQuery = query(collection(db, "academic-terms"), where("isCurrent", "==", true));
        const unsubscribeSettings = onSnapshot(academicTermsQuery, (snapshot) => {
            if (!snapshot.empty) {
                const termDoc = snapshot.docs[0];
                setCurrentTerm({ id: termDoc.id, ...termDoc.data() } as AcademicTerm);
            } else {
                setCurrentTerm(null);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching settings:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch academic term." });
            setIsLoading(false);
        });

        return () => {
            unsubscribeStudents();
            unsubscribePayments();
            unsubscribeSettings();
        };
    }, [toast]);

    const summaryData: FinancialSummaryItem[] = React.useMemo(() => {
        if (!currentTerm) return [];

        const newStudentIds = new Set(
            students
                .filter(s => s.admissionYear === currentTerm.academicYear && s.admissionTerm === currentTerm.session)
                .map(s => s.id)
        );
        
        const newStudentPayments = payments.filter(p => newStudentIds.has(p.studentId));

        const incomeByCategory = new Map<string, number>();

        newStudentPayments.forEach(payment => {
            payment.items?.forEach(item => {
                const currentAmount = incomeByCategory.get(item.name) || 0;
                incomeByCategory.set(item.name, currentAmount + item.amount);
            });
        });

        return Array.from(incomeByCategory.entries())
            .map(([category, total]) => ({ category, total }))
            .sort((a, b) => b.total - a.total);

    }, [students, payments, currentTerm]);

    const totalNewAdmissions = students.filter(s => currentTerm && s.admissionYear === currentTerm.academicYear && s.admissionTerm === currentTerm.session).length;
    const totalIncome = summaryData.reduce((sum, item) => sum + item.total, 0);

    return (
        <>
            <PageHeader
                title="Financial Summary"
                description={`A breakdown of income from new admissions for the current term (${currentTerm?.session || ''} ${currentTerm?.academicYear || ''}).`}
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <StatCard 
                    title="New Admissions"
                    value={totalNewAdmissions.toLocaleString()}
                    icon={UserPlus}
                    color="text-blue-500"
                    description="For the current term"
                />
                <StatCard 
                    title="Total Income from New Admissions"
                    value={formatCurrency(totalIncome)}
                    icon={DollarSign}
                    color="text-green-500"
                    description="Sum of all payments"
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Income Breakdown by Category</CardTitle>
                    <CardDescription>
                        This table shows the total amount received for each fee category from newly admitted students.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fee Category</TableHead>
                                    <TableHead className="text-right">Total Amount Received</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                        </TableCell>
                                    </TableRow>
                                ) : summaryData.length > 0 ? (
                                    summaryData.map(item => (
                                        <TableRow key={item.category}>
                                            <TableCell className="font-medium">{item.category}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center">
                                            No income from new admissions recorded for this term yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
