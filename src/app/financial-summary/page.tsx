
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
import { DollarSign, UserPlus, Users } from 'lucide-react';


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

    const newAdmissionsSummary: FinancialSummaryItem[] = React.useMemo(() => {
        if (!currentTerm) return [];

        const newStudentIds = new Set(
            students
                .filter(s => s.admissionYear === currentTerm.academicYear && s.admissionTerm === currentTerm.session)
                .map(s => s.id)
        );
        
        const newStudentPayments = payments.filter(p => 
            newStudentIds.has(p.studentId) &&
            p.academicYear === currentTerm.academicYear &&
            p.term === currentTerm.session
        );

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

    const continuingStudentsSummary: FinancialSummaryItem[] = React.useMemo(() => {
        if (!currentTerm) return [];

        const newStudentIds = new Set(
            students
                .filter(s => s.admissionYear === currentTerm.academicYear && s.admissionTerm === currentTerm.session)
                .map(s => s.id)
        );

        const continuingStudentPayments = payments.filter(p => 
            !newStudentIds.has(p.studentId) &&
            p.academicYear === currentTerm.academicYear &&
            p.term === currentTerm.session
        );

        const incomeByCategory = new Map<string, number>();

        continuingStudentPayments.forEach(payment => {
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
    const totalContinuingStudents = students.filter(s => currentTerm && !(s.admissionYear === currentTerm.academicYear && s.admissionTerm === currentTerm.session)).length;
    
    const newAdmissionsIncome = newAdmissionsSummary.reduce((sum, item) => sum + item.total, 0);
    const continuingStudentsIncome = continuingStudentsSummary.reduce((sum, item) => sum + item.total, 0);

    return (
        <>
            <PageHeader
                title="Financial Summary"
                description={`A breakdown of income for the current term (${currentTerm?.session || ''} ${currentTerm?.academicYear || ''}).`}
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <StatCard 
                    title="New Admissions"
                    value={totalNewAdmissions.toLocaleString()}
                    icon={UserPlus}
                    color="text-blue-500"
                    description={`Income: ${formatCurrency(newAdmissionsIncome)}`}
                />
                <StatCard 
                    title="Continuing Students"
                    value={totalContinuingStudents.toLocaleString()}
                    icon={Users}
                    color="text-purple-500"
                    description={`Income: ${formatCurrency(continuingStudentsIncome)}`}
                />
                 <StatCard 
                    title="Total Income (New Admissions)"
                    value={formatCurrency(newAdmissionsIncome)}
                    icon={DollarSign}
                    color="text-green-500"
                />
                <StatCard 
                    title="Total Income (Continuing)"
                    value={formatCurrency(continuingStudentsIncome)}
                    icon={DollarSign}
                    color="text-green-500"
                />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Income from New Admissions</CardTitle>
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
                                    ) : newAdmissionsSummary.length > 0 ? (
                                        newAdmissionsSummary.map(item => (
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
                 <Card>
                    <CardHeader>
                        <CardTitle>Income from Continuing Students</CardTitle>
                        <CardDescription>
                            This table shows the total amount received for each fee category from continuing students for this term.
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
                                    ) : continuingStudentsSummary.length > 0 ? (
                                        continuingStudentsSummary.map(item => (
                                            <TableRow key={item.category}>
                                                <TableCell className="font-medium">{item.category}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="h-24 text-center">
                                                No income from continuing students recorded for this term yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
