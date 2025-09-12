
'use client'

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Student, Payment, AcademicTerm, FinancialSummaryItem, Transaction } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { isToday, isThisWeek, isThisMonth } from 'date-fns';


import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import StatCard from '@/components/dashboard/stat-card';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "GHS",
    }).format(amount)
}

function SummaryDisplay({
    filteredPayments,
    filteredTransactions,
    newStudents,
    continuingStudents
}: {
    filteredPayments: Payment[];
    filteredTransactions: Transaction[];
    newStudents: Student[];
    continuingStudents: Student[];
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
    
    const otherIncomeSummary: FinancialSummaryItem[] = React.useMemo(() => {
        const incomeByCategory = new Map<string, number>();
        filteredTransactions.filter(t => t.type === 'income').forEach(transaction => {
            const currentAmount = incomeByCategory.get(transaction.categoryName) || 0;
            incomeByCategory.set(transaction.categoryName, currentAmount + transaction.amount);
        });
        return Array.from(incomeByCategory.entries())
            .map(([category, total]) => ({ category, total }))
            .sort((a, b) => b.total - a.total);
    }, [filteredTransactions]);

    const expenseSummary: FinancialSummaryItem[] = React.useMemo(() => {
        const expenseByCategory = new Map<string, number>();
        filteredTransactions.filter(t => t.type === 'expense').forEach(transaction => {
            const currentAmount = expenseByCategory.get(transaction.categoryName) || 0;
            expenseByCategory.set(transaction.categoryName, currentAmount + transaction.amount);
        });
        return Array.from(expenseByCategory.entries())
            .map(([category, total]) => ({ category, total }))
            .sort((a, b) => b.total - a.total);
    }, [filteredTransactions]);


    const feeIncome = newAdmissionsSummary.reduce((sum, item) => sum + item.total, 0) + continuingStudentsSummary.reduce((sum, item) => sum + item.total, 0);
    const otherIncome = otherIncomeSummary.reduce((sum, item) => sum + item.total, 0);
    const totalIncome = feeIncome + otherIncome;
    const totalExpense = expenseSummary.reduce((sum, t) => sum + t.total, 0);
    const netBalance = totalIncome - totalExpense;
    
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
                 <StatCard 
                    title="Total Income"
                    value={formatCurrency(totalIncome)}
                    icon={TrendingUp}
                    color="text-green-500"
                    description={`Fees + Other income`}
                />
                <StatCard 
                    title="Total Expenses"
                    value={formatCurrency(totalExpense)}
                    icon={TrendingDown}
                    color="text-red-500"
                    description={`All recorded expenses`}
                />
                 <StatCard 
                    title="Net Balance"
                    value={formatCurrency(netBalance)}
                    icon={DollarSign}
                    color={netBalance >= 0 ? "text-primary" : "text-destructive"}
                    description={`Income minus expenses`}
                />
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Income from New Admissions</CardTitle>
                        <CardDescription>
                            Total amount received for each fee category from newly admitted students.
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
                                                No income from new admissions recorded.
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
                            Total amount received for each fee category from continuing students.
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
                                                No income from continuing students recorded.
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
                        <CardTitle>Other Income</CardTitle>
                        <CardDescription>
                            Breakdown of non-fee related income from other transactions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Income Category</TableHead>
                                        <TableHead className="text-right">Total Amount Received</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {otherIncomeSummary.length > 0 ? (
                                        otherIncomeSummary.map(item => (
                                            <TableRow key={item.category}>
                                                <TableCell className="font-medium">{item.category}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="h-24 text-center">
                                                No other income recorded.
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
                        <CardTitle>Expenses</CardTitle>
                        <CardDescription>
                            Breakdown of all recorded expenses by category.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Expense Category</TableHead>
                                        <TableHead className="text-right">Total Amount Spent</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {expenseSummary.length > 0 ? (
                                        expenseSummary.map(item => (
                                            <TableRow key={item.category}>
                                                <TableCell className="font-medium">{item.category}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="h-24 text-center">
                                                No expenses recorded.
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
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [currentTerm, setCurrentTerm] = useState<AcademicTerm | null>(null);
    const [isLoading, setIsLoading] = useState(true);
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
        });

        const transactionsQuery = query(collection(db, "transactions"));
        const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
            setAllTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
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
            unsubscribeTransactions();
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

    const getFilteredData = (filter: 'today' | 'week' | 'month' | 'term' | 'year') => {
        if (!currentTerm) return { payments: [], transactions: [] };
        
        const filterFn = (dateStr: string) => {
            const date = new Date(dateStr);
            switch(filter) {
                case 'today': return isToday(date);
                case 'week': return isThisWeek(date, { weekStartsOn: 1 });
                case 'month': return isThisMonth(date);
                case 'term': return date >= new Date(currentTerm.startDate) && date <= new Date(currentTerm.endDate);
                case 'year':
                    const yearStart = new Date(currentTerm.academicYear.split('-')[0], 8, 1); // Assuming academic year starts Sep 1
                    const yearEnd = new Date(parseInt(currentTerm.academicYear.split('-')[1]), 7, 31);
                    return date >= yearStart && date <= yearEnd;
                default: return true;
            }
        }
        
        const payments = allPayments.filter(p => filterFn(p.date));
        const transactions = allTransactions.filter(t => filterFn(t.date));

        return { payments, transactions };
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
                        <SummaryCard title="Today's Summary" description={`Financial breakdown for today.`} data={getFilteredData('today')} newStudents={newStudents} continuingStudents={continuingStudents} />
                    </TabsContent>
                    <TabsContent value="week">
                        <SummaryCard title="This Week's Summary" description={`Financial breakdown for this week.`} data={getFilteredData('week')} newStudents={newStudents} continuingStudents={continuingStudents} />
                    </TabsContent>
                    <TabsContent value="month">
                        <SummaryCard title="This Month's Summary" description={`Financial breakdown for this month.`} data={getFilteredData('month')} newStudents={newStudents} continuingStudents={continuingStudents} />
                    </TabsContent>
                    <TabsContent value="term">
                        <SummaryCard title="Current Term Summary" description={`Financial breakdown for ${currentTerm.session} of the ${currentTerm.academicYear} academic year.`} data={getFilteredData('term')} newStudents={newStudents} continuingStudents={continuingStudents} />
                    </TabsContent>
                    <TabsContent value="year">
                        <SummaryCard title="Full Year Summary" description={`Financial breakdown for the entire ${currentTerm.academicYear} academic year.`} data={getFilteredData('year')} newStudents={newStudents} continuingStudents={continuingStudents} />
                    </TabsContent>
                </Tabs>
            )}
        </>
    );
}

function SummaryCard({ title, description, data, newStudents, continuingStudents }: { title: string, description: string, data: { payments: Payment[], transactions: Transaction[] }, newStudents: Student[], continuingStudents: Student[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <SummaryDisplay 
                    filteredPayments={data.payments}
                    filteredTransactions={data.transactions}
                    newStudents={newStudents}
                    continuingStudents={continuingStudents}
                />
            </CardContent>
        </Card>
    )
}
