
'use client'

import React from 'react';
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { FeeStructure, SchoolClass, AcademicTerm } from '@/types';
import { useToast } from '@/hooks/use-toast';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { Badge } from '@/components/ui/badge';


type FeeSummary = {
    newAdmissionTotal: number;
    term1Total: number;
    term2And3Total: number;
    printingFee: number;
    hasStructure: boolean;
}

const categoryOrder = ['Pre-school', 'Primary', 'Junior High School'];
const preSchoolOrder = ['Creche', 'Nursery 1', 'Nursery 2', 'Kindergarten 1', 'Kindergarten 2'];


export default function FeesPage() {
    const [feeStructures, setFeeStructures] = React.useState<FeeStructure[]>([]);
    const [classes, setClasses] = React.useState<SchoolClass[]>([]);
    const [terms, setTerms] = React.useState<AcademicTerm[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const { toast } = useToast();

    React.useEffect(() => {
        const feeStructuresQuery = query(collection(db, "fee-structures"));
        const unsubscribeFeeStructures = onSnapshot(feeStructuresQuery, (snapshot) => {
            const data: FeeStructure[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeStructure));
            setFeeStructures(data);
            if (classes.length > 0 && terms.length > 0) setIsLoading(false);
        }, (error) => {
            console.error("Error fetching fee structures:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch fee structures." });
            setIsLoading(false);
        });

        const classesQuery = query(collection(db, "classes"));
        const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
            const data: SchoolClass[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
            const sortedData = data.sort((a, b) => {
                const catAIndex = categoryOrder.indexOf(a.category);
                const catBIndex = categoryOrder.indexOf(b.category);
                if (catAIndex !== catBIndex) return catAIndex - catBIndex;

                if (a.category === 'Pre-school') {
                    const preAIndex = preSchoolOrder.indexOf(a.name);
                    const preBIndex = preSchoolOrder.indexOf(b.name);
                    if (preAIndex !== -1 && preBIndex !== -1) return preAIndex - preBIndex;
                    if (preAIndex !== -1) return -1;
                    if (preBIndex !== -1) return 1;
                }

                return a.name.localeCompare(b.name);
            });
            setClasses(sortedData);
             if (feeStructures.length > 0 && terms.length > 0) setIsLoading(false);
        });

        const termsQuery = query(collection(db, "academic-terms"));
        const unsubscribeTerms = onSnapshot(termsQuery, (snapshot) => {
            const data: AcademicTerm[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AcademicTerm));
            setTerms(data);
             if (feeStructures.length > 0 && classes.length > 0) setIsLoading(false);
        });
        
        // In case collections are empty, we should not keep loading forever
        const timer = setTimeout(() => setIsLoading(false), 5000);

        return () => {
            clearTimeout(timer);
            unsubscribeFeeStructures();
            unsubscribeClasses();
            unsubscribeTerms();
        };
    }, [toast]);

    const calculateFees = (classId: string): FeeSummary => {
        // Find the current term to locate the relevant fee structure
        const currentTerm = terms.find(t => t.isCurrent);
        if (!currentTerm) {
            return { newAdmissionTotal: 0, term1Total: 0, term2And3Total: 0, printingFee: 0, hasStructure: false };
        }
        
        const structure = feeStructures.find(fs => fs.classId === classId && fs.academicTermId === currentTerm.id);

        if (!structure) {
            return { newAdmissionTotal: 0, term1Total: 0, term2And3Total: 0, printingFee: 0, hasStructure: false };
        }

        const { admissionFee = 0, schoolFees = 0, booksFee = 0, uniformFee = 0, others = 0, printingFee = 0 } = structure;

        const newAdmissionTotal = admissionFee + schoolFees + booksFee + uniformFee + others;
        const term1Total = schoolFees + booksFee + others;
        const term2And3Total = schoolFees + others;

        return { newAdmissionTotal, term1Total, term2And3Total, printingFee, hasStructure: true };
    };

    return (
        <>
            <PageHeader
                title="Fees Price List"
                description="A summary of the fee structure for the current academic term."
            />
            <Card>
                <CardHeader>
                    <CardTitle>Fee Breakdown by Class</CardTitle>
                    <CardDescription>
                        This table shows the calculated fees for new and continuing students for the current term.
                        To modify these amounts, go to Settings &gt; Fee Structure.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Class</TableHead>
                                    <TableHead className="text-right">New Admission Total</TableHead>
                                    <TableHead className="text-right">Term 1 Total (Continuing)</TableHead>
                                    <TableHead className="text-right">Term 2/3 Total (Continuing)</TableHead>
                                    <TableHead className="text-right">Printing Fee (Optional)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                        </TableCell>
                                    </TableRow>
                                ) : classes.length > 0 ? (
                                    classes.map(cls => {
                                        const fees = calculateFees(cls.id);
                                        return (
                                            <TableRow key={cls.id}>
                                                <TableCell className="font-medium">{cls.name}</TableCell>
                                                {fees.hasStructure ? (
                                                    <>
                                                        <TableCell className="text-right">GHS {fees.newAdmissionTotal.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right">GHS {fees.term1Total.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right">GHS {fees.term2And3Total.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right">GHS {fees.printingFee.toFixed(2)}</TableCell>
                                                    </>
                                                ) : (
                                                    <TableCell colSpan={4} className="text-center">
                                                        <Badge variant="secondary">No fee structure defined for the current term</Badge>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No classes found. Please add classes in settings.
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
