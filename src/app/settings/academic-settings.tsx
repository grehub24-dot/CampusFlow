
'use client'

import React from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, writeBatch, query, getDocs } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { AcademicTerm } from '@/types';
import { useToast } from '@/hooks/use-toast';
import type { SubmitHandler } from 'react-hook-form';
import { format } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, PlusCircle, MoreHorizontal, CheckCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

import { AcademicTermForm, type FormValues } from './academic-settings-form';
import { useAuth } from '@/context/auth-context';
import { logActivity } from '@/lib/activity-logger';

export function AcademicSettings() {
    const [terms, setTerms] = React.useState<AcademicTerm[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
    const [selectedTerm, setSelectedTerm] = React.useState<AcademicTerm | null>(null);
    const { toast } = useToast();
    const { user } = useAuth();

    React.useEffect(() => {
        const q = query(collection(db, "academic-terms"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const termsData: AcademicTerm[] = [];
            querySnapshot.forEach((doc) => {
                termsData.push({ id: doc.id, ...doc.data() } as AcademicTerm);
            });
            // Sort by academic year desc, then by session asc
            termsData.sort((a, b) => {
                if (a.academicYear > b.academicYear) return -1;
                if (a.academicYear < b.academicYear) return 1;
                if (a.session < b.session) return -1;
                if (a.session > b.session) return 1;
                return 0;
            });
            setTerms(termsData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching academic terms:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch academic terms." });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);

    const handleAddNew = () => {
        setSelectedTerm(null);
        setIsFormDialogOpen(true);
    };

    const handleEdit = (term: AcademicTerm) => {
        setSelectedTerm(term);
        setIsFormDialogOpen(true);
    };

    const handleSetCurrent = async (termToSet: AcademicTerm) => {
        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            const termsQuery = query(collection(db, 'academic-terms'));
            const querySnapshot = await getDocs(termsQuery);

            querySnapshot.forEach(documentSnapshot => {
                 const termRef = doc(db, 'academic-terms', documentSnapshot.id);
                 if (documentSnapshot.id === termToSet.id) {
                     batch.update(termRef, { isCurrent: true });
                 } else {
                     batch.update(termRef, { isCurrent: false });
                 }
            });

            await batch.commit();

            await logActivity(user, 'Set Current Term', `Set ${termToSet.session} ${termToSet.academicYear} as the current academic term.`);

            toast({
                title: 'Current Term Updated',
                description: `${termToSet.academicYear} - ${termToSet.session} is now the current term.`,
            });
        } catch (error) {
             console.error("Error setting current term: ", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not set the current term. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const handleFormDialogClose = (open: boolean) => {
        if (!open) {
            setSelectedTerm(null);
        }
        setIsFormDialogOpen(open);
    }

    const onSubmit: SubmitHandler<FormValues> = async (values) => {
        setIsSubmitting(true);
        try {
            const termData = {
                academicYear: values.academicYear,
                session: values.session,
                startDate: values.startDate.toISOString(),
                endDate: values.endDate.toISOString(),
            };
            const details = `${termData.session} ${termData.academicYear}`;

            if (selectedTerm) {
                const termDocRef = doc(db, "academic-terms", selectedTerm.id);
                await updateDoc(termDocRef, termData);
                await logActivity(user, 'Update Academic Term', `Updated academic term: ${details}.`);
                toast({
                    title: 'Term Updated',
                    description: 'The academic term has been successfully updated.',
                });
            } else {
                await addDoc(collection(db, "academic-terms"), { ...termData, isCurrent: false });
                await logActivity(user, 'Add Academic Term', `Added new academic term: ${details}.`);
                toast({
                    title: 'Term Added',
                    description: 'The new academic term has been successfully added.',
                });
            }
            
            setIsFormDialogOpen(false);
            setSelectedTerm(null);

        } catch (error) {
            console.error("Error saving term: ", error);
            toast({
                variant: "destructive",
                title: "Save Error",
                description: "Could not save the academic term. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Academic Year Settings</CardTitle>
                        <CardDescription>Manage all academic years and sessions/terms for the school.</CardDescription>
                    </div>
                    <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogClose}>
                        <DialogTrigger asChild>
                            <Button onClick={handleAddNew}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add New Term
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                            <DialogTitle>{selectedTerm ? 'Edit Academic Term' : 'Add New Academic Term'}</DialogTitle>
                            <DialogDescription>
                                {selectedTerm ? "Update the details for the academic term." : "Fill out the details below to add a new term."}
                            </DialogDescription>
                            </DialogHeader>
                            <div className="p-1">
                               <AcademicTermForm 
                                  onSubmit={onSubmit} 
                                  defaultValues={selectedTerm || undefined}
                               />
                            </div>
                            {isSubmitting && (
                                <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Academic Year</TableHead>
                                <TableHead>Session</TableHead>
                                <TableHead>Start Date</TableHead>
                                <TableHead>End Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                    </TableCell>
                                </TableRow>
                            ) : terms.length > 0 ? (
                                terms.map(term => (
                                    <TableRow key={term.id}>
                                        <TableCell>{term.academicYear}</TableCell>
                                        <TableCell>{term.session}</TableCell>
                                        <TableCell>{format(new Date(term.startDate), 'PPP')}</TableCell>
                                        <TableCell>{format(new Date(term.endDate), 'PPP')}</TableCell>
                                        <TableCell>
                                            {term.isCurrent && <Badge><CheckCircle className="mr-2 h-4 w-4" />Current</Badge>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0" disabled={isSubmitting}>
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleEdit(term)}>Edit Term</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {!term.isCurrent && (
                                                        <DropdownMenuItem onClick={() => handleSetCurrent(term)}>
                                                            Set as Current
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No academic terms found. Please add one to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
