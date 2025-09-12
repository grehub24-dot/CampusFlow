
'use client'

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { Transaction, TransactionCategory, Student, Payment, AcademicTerm } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { isToday, isThisWeek, isThisMonth } from 'date-fns';

import { PageHeader } from "@/components/page-header";
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, DollarSign, TrendingUp, TrendingDown, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionsTable } from './transactions-table';
import { getTransactionColumns } from './columns';
import { CategoryManagement } from './category-management';
import StatCard from '@/components/dashboard/stat-card';
import { TransactionForm, FormValues } from './transaction-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import type { SubmitHandler } from 'react-hook-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


export default function IncomeExpensePage() {
  const [manualTransactions, setManualTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [currentTerm, setCurrentTerm] = React.useState<AcademicTerm | null>(null);
  const [timeFilter, setTimeFilter] = React.useState<'all' | 'today' | 'week' | 'month'>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    const transactionsQuery = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      setManualTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      if(!isLoading) setIsLoading(false);
    });
    
    const categoriesQuery = query(collection(db, "transaction-categories"), orderBy("name"));
    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
        setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransactionCategory)));
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
    });
    
    setIsLoading(false);

    return () => {
      unsubscribeTransactions();
      unsubscribeCategories();
      unsubscribePayments();
      unsubscribeSettings();
    };
  }, []);

  const allTransactions = React.useMemo(() => {
    const paymentTransactions: Transaction[] = payments.flatMap(payment =>
      payment.items?.map((item, index) => ({
        id: `${payment.id}-${index}`, // Create a unique-ish ID
        date: payment.date,
        type: 'income' as const,
        amount: item.amount,
        categoryId: item.name, // Use name as a pseudo-ID
        categoryName: item.name,
        description: `Fee payment from ${payment.studentName}`,
        isFromPayment: true, // Flag to identify payment-derived transactions
      })) || []
    );

    const combined = [...manualTransactions, ...paymentTransactions];
    
    const filteredByTime = combined.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      if (timeFilter === 'today') return isToday(transactionDate);
      if (timeFilter === 'week') return isThisWeek(transactionDate, { weekStartsOn: 1 });
      if (timeFilter === 'month') return isThisMonth(transactionDate);
      return true; // 'all'
    });
    
    filteredByTime.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return filteredByTime;
  }, [manualTransactions, payments, timeFilter]);


  const handleAddClick = () => {
    setSelectedTransaction(null);
    setIsFormOpen(true);
  }

  const handleEditClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsFormOpen(true);
  }

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
  }

  const handleConfirmDelete = async () => {
    if (!transactionToDelete || transactionToDelete.isFromPayment) return;
    setIsSubmitting(true);
    try {
        await deleteDoc(doc(db, "transactions", transactionToDelete.id));
        toast({ title: "Transaction Deleted", description: "The transaction has been removed."});
    } catch(e) {
        toast({ variant: "destructive", title: "Error", description: "Could not delete the transaction." });
        console.error(e);
    } finally {
        setTransactionToDelete(null);
        setIsSubmitting(false);
    }
  }


  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      const categoryName = categories.find(c => c.id === values.categoryId)?.name || 'Uncategorized';
      const data = { ...values, categoryName, date: values.date.toISOString() };

      if (selectedTransaction) {
        // Update
        const docRef = doc(db, "transactions", selectedTransaction.id);
        await updateDoc(docRef, data);
        toast({ title: "Transaction Updated", description: "The transaction has been successfully updated."});
      } else {
        // Create
        await addDoc(collection(db, "transactions"), data);
        toast({ title: "Transaction Added", description: "The new transaction has been recorded."});
      }
      setIsFormOpen(false);
      setSelectedTransaction(null);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Could not save the transaction."});
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }

  const columns = React.useMemo(() => getTransactionColumns({ onEdit: handleEditClick, onDelete: handleDeleteClick }), []);

  const totalIncome = allTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = allTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;


  return (
    <>
      <PageHeader
        title="Income & Expense Tracking"
        description="Monitor your school's financial health by tracking income and expenses."
      >
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
                <Button onClick={handleAddClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Transaction
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{selectedTransaction ? 'Edit' : 'Add'} Transaction</DialogTitle>
                    <DialogDescription>Record a new income or expense transaction.</DialogDescription>
                </DialogHeader>
                <TransactionForm
                    onSubmit={onSubmit}
                    categories={categories}
                    defaultValues={selectedTransaction || undefined}
                />
            </DialogContent>
        </Dialog>
      </PageHeader>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
         <StatCard 
            title="Total Income"
            value={`GHS ${totalIncome.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
            icon={TrendingUp}
            color="text-green-500"
            description="School fees + Other income"
        />
        <StatCard 
            title="Total Expenses"
            value={`GHS ${totalExpense.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
            icon={TrendingDown}
            color="text-red-500"
            description="All recorded expenses"
        />
        <StatCard 
            title="Net Balance"
            value={`GHS ${netBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
            icon={DollarSign}
            color={netBalance >= 0 ? "text-primary" : "text-destructive"}
            description="Income minus expenses"
        />
      </div>

      <Tabs defaultValue="transactions">
          <TabsList>
              <TabsTrigger value="transactions">All Transactions</TabsTrigger>
              <TabsTrigger value="categories">Manage Categories</TabsTrigger>
          </TabsList>
          <TabsContent value="transactions" className="space-y-4">
            <TransactionsTable 
                columns={columns} 
                data={allTransactions} 
                timeFilter={timeFilter}
                onTimeFilterChange={setTimeFilter}
            />
          </TabsContent>
          <TabsContent value="categories" className="space-y-4">
            <CategoryManagement categories={categories} />
          </TabsContent>
      </Tabs>

      <AlertDialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete this transaction. This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} disabled={isSubmitting}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
