
'use client'

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Student, Payment, AcademicTerm, FinancialSummaryItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { isToday, isThisWeek, isThisMonth } from 'date-fns';


import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import StatCard from '@/components/dashboard/stat-card';
import { DollarSign } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "GHS",
    }).format(amount)
}

function SummaryDisplay({
    filteredPayments,
    newStudents,
    continuingStudents,
    allTimeIncome
}: {
    filteredPayments: Payment[];
    newStudents: Student[];
    continuingStudents: Student[];
    allTimeIncome: number;
}) {
    const newStudentPayments = React.useMemo(() => {
        const newStudentIds = new Set(newStudents.map(s => s.id));
        return filteredPayments.filter(p => newStudentIds.has(p.studentId));
    }, [filteredPayments, newStudents]);

    const continuingStudentPayments = React.useMemo(() => {
        const continuingStudentIds = new Set(continuingStudents.map(s => s.id));
        return filteredPayments.filter(p => continuingStudentIds.has(p.studentId));
    }, [filteredPayments, continuingStudents]);

    const newAdmissionsSummary: FinancialSummaryItem[] = React.useMemo(() => {
        const incomeByCategory = new Map<string, number>();
        newStudentPayments.forEach(payment => {
            if (Array.isArray(payment.items)) {
                payment.items.forEach(item => {
                    const currentAmount = incomeByCategory.get(item.name) || 0;
                    incomeByCategory.set(item.name, currentAmount + item.amount);
                });
            }
        });
        return Array.from(incomeByCategory.entries())
            .map(([category, total]) => ({ category, total }))
            .sort((a, b) => b.total - a.total);
    }, [newStudentPayments]);
    
    const continuingStudentsSummary: FinancialSummaryItem[] = React.useMemo(() => {
        const incomeByCategory = new Map<string, number>();
        continuingStudentPayments.forEach(payment => {
            if (Array.isArray(payment.items)) {
                payment.items.forEach(item => {
                    const currentAmount = incomeByCategory.get(item.name) || 0;
                    incomeByCategory.set(item.name, currentAmount + item.amount);
                });
            }
        });
        return Array.from(incomeByCategory.entries())
            .map(([category, total]) => ({ category, total }))
            .sort((a, b) => b.total - a.total);
    }, [continuingStudentPayments]);


    const newAdmissionsIncome = newAdmissionsSummary.reduce((sum, item) => sum + item.total, 0);
    const continuingStudentsIncome = continuingStudentsSummary.reduce((sum, item) => sum + item.total, 0);
    
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                 <StatCard 
                    title="Total Income (New Admissions)"
                    value={formatCurrency(newAdmissionsIncome)}
                    icon={DollarSign}
                    color="text-green-500"
                    description={`${newStudents.length} new students`}
                />
                <StatCard 
                    title="Total Income (Continuing)"
                    value={formatCurrency(continuingStudentsIncome)}
                    icon={DollarSign}
                    color="text-purple-500"
                    description={`${continuingStudents.length} continuing students`}
                />
                 <StatCard 
                    title="Total Combined Income"
                    value={formatCurrency(newAdmissionsIncome + continuingStudentsIncome)}
                    icon={DollarSign}
                    color="text-blue-500"
                    description={`All-time record: ${formatCurrency(allTimeIncome)}`}
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
                                    {newAdmissionsSummary.length > 0 ? (
                                        newAdmissionsSummary.map(item => (
                                            <TableRow key={item.category}>
                                                <TableCell className="font-medium">{item.category}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="h-24 text-center">
                                                No income from new admissions recorded for this period yet.
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
                            This table shows the total amount received for each fee category from continuing students for this period.
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
                                    {continuingStudentsSummary.length > 0 ? (
                                        continuingStudentsSummary.map(item => (
                                            <TableRow key={item.category}>
                                                <TableCell className="font-medium">{item.category}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="h-24 text-center">
                                                No income from continuing students recorded for this period yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function FinancialSummaryPage() {
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [allPayments, setAllPayments] = useState<Payment[]>([]);
    const [currentTerm, setCurrentTerm] = useState<AcademicTerm | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [allTimeIncome, setAllTimeIncome] = useState(0);
    const { toast } = useToast();

    useEffect(() => {
        const studentsQuery = query(collection(db, "students"));
        const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
            setAllStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
        });
        
        const paymentsQuery = query(collection(db, "payments"));
        const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
            const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
            setAllPayments(payments);
            const total = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
            setAllTimeIncome(total);
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
    
    const { newStudents, continuingStudents } = React.useMemo(() => {
        if (!currentTerm) return { newStudents: [], continuingStudents: [] };
        const newStudentList: Student[] = [];
        const continuingStudentList: Student[] = [];
        allStudents.forEach(s => {
            if (s.admissionYear === currentTerm.academicYear && s.admissionTerm === currentTerm.session) {
                newStudentList.push(s);
            } else {
                continuingStudentList.push(s);
            }
        });
        return { newStudents: newStudentList, continuingStudents: continuingStudentList };
    }, [allStudents, currentTerm]);

    const getFilteredPayments = (filter: 'today' | 'week' | 'month' | 'term' | 'year') => {
        if (!currentTerm) return [];
        
        return allPayments.filter(p => {
            const paymentDate = new Date(p.date);
            switch(filter) {
                case 'today':
                    return isToday(paymentDate);
                case 'week':
                    return isThisWeek(paymentDate, { weekStartsOn: 1 });
                case 'month':
                    return isThisMonth(paymentDate);
                case 'term':
                    return p.academicYear === currentTerm.academicYear && p.term === currentTerm.session;
                case 'year':
                    return p.academicYear === currentTerm.academicYear;
                default:
                    return true;
            }
        });
    }

    return (
        <>
            <PageHeader
                title="Financial Summary"
                description={`A breakdown of income for the ${currentTerm?.academicYear || ''} academic year.`}
            />

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                </div>
            ) : !currentTerm ? (
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">Please set a current academic term in settings to view the financial summary.</p>
                    </CardContent>
                </Card>
            ) : (
                <Tabs defaultValue="term">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="today">Today</TabsTrigger>
                        <TabsTrigger value="week">This Week</TabsTrigger>
                        <TabsTrigger value="month">This Month</TabsTrigger>
                        <TabsTrigger value="term">Current Term</TabsTrigger>
                        <TabsTrigger value="year">Full Year</TabsTrigger>
                    </TabsList>
                     <TabsContent value="today">
                        <SummaryCard title="Today's Summary" description={`Financial breakdown for today.`} payments={getFilteredPayments('today')} newStudents={newStudents} continuingStudents={continuingStudents} allTimeIncome={allTimeIncome} />
                    </TabsContent>
                    <TabsContent value="week">
                        <SummaryCard title="This Week's Summary" description={`Financial breakdown for this week.`} payments={getFilteredPayments('week')} newStudents={newStudents} continuingStudents={continuingStudents} allTimeIncome={allTimeIncome} />
                    </TabsContent>
                    <TabsContent value="month">
                        <SummaryCard title="This Month's Summary" description={`Financial breakdown for this month.`} payments={getFilteredPayments('month')} newStudents={newStudents} continuingStudents={continuingStudents} allTimeIncome={allTimeIncome} />
                    </TabsContent>
                    <TabsContent value="term">
                        <SummaryCard title="Current Term Summary" description={`Financial breakdown for ${currentTerm.session} of the ${currentTerm.academicYear} academic year.`} payments={getFilteredPayments('term')} newStudents={newStudents} continuingStudents={continuingStudents} allTimeIncome={allTimeIncome} />
                    </TabsContent>
                    <TabsContent value="year">
                        <SummaryCard title="Full Year Summary" description={`Financial breakdown for the entire ${currentTerm.academicYear} academic year.`} payments={getFilteredPayments('year')} newStudents={newStudents} continuingStudents={continuingStudents} allTimeIncome={allTimeIncome} />
                    </TabsContent>
                </Tabs>
            )}
        </>
    );
}

function SummaryCard({ title, description, payments, newStudents, continuingStudents, allTimeIncome }: { title: string, description: string, payments: Payment[], newStudents: Student[], continuingStudents: Student[], allTimeIncome: number }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <SummaryDisplay 
                    filteredPayments={payments} 
                    newStudents={newStudents}
                    continuingStudents={continuingStudents}
                    allTimeIncome={allTimeIncome}
                />
            </CardContent>
        </Card>
    )
}
