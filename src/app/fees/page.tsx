
'use client'

import React from 'react';
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { FeeStructure, SchoolClass, AcademicTerm, FeeItem } from '@/types';
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
    optionalTotal: number;
    hasStructure: boolean;
}

const categoryOrder = ['Pre-school', 'Primary', 'Junior High School'];
const preSchoolOrder = ['Creche', 'Nursery 1', 'Nursery 2', 'Kindergarten 1', 'Kindergarten 2'];


export default function FeesPage() {
    const [feeStructures, setFeeStructures] = React.useState<FeeStructure[]>([]);
    const [classes, setClasses] = React.useState<SchoolClass[]>([]);
    const [terms, setTerms] = React.useState<AcademicTerm[]>([]);
    const [feeItems, setFeeItems] = React.useState<FeeItem[]>([]);
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
        
        const feeItemsQuery = query(collection(db, "fee-items"));
        const unsubscribeFeeItems = onSnapshot(feeItemsQuery, (snapshot) => {
            const data: FeeItem[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeItem));
            setFeeItems(data);
        });

        // In case collections are empty, we should not keep loading forever
        const timer = setTimeout(() => setIsLoading(false), 5000);

        return () => {
            clearTimeout(timer);
            unsubscribeFeeStructures();
            unsubscribeClasses();
            unsubscribeTerms();
            unsubscribeFeeItems();
        };
    }, [toast]);

    const calculateFees = (classId: string): FeeSummary => {
        const currentTerm = terms.find(t => t.isCurrent);
        if (!currentTerm) {
            return { newAdmissionTotal: 0, term1Total: 0, term2And3Total: 0, optionalTotal: 0, hasStructure: false };
        }
        
        const structure = feeStructures.find(fs => fs.classId === classId && fs.academicTermId === currentTerm.id);

        if (!structure) {
            return { newAdmissionTotal: 0, term1Total: 0, term2And3Total: 0, optionalTotal: 0, hasStructure: false };
        }
        
        let newAdmissionTotal = 0;
        let term1Total = 0;
        let term2And3Total = 0;
        let optionalTotal = 0;

        if (Array.isArray(structure.items)) {
            structure.items.forEach(item => {
                const feeItemInfo = feeItems.find(fi => fi.id === item.feeItemId);
                if (feeItemInfo) {
                    if (feeItemInfo.isOptional) {
                        optionalTotal += item.amount;
                    } else {
                        if (feeItemInfo.appliesTo.includes('new')) {
                            newAdmissionTotal += item.amount;
                        }
                        if (feeItemInfo.appliesTo.includes('term1')) {
                            term1Total += item.amount;
                        }
                        if (feeItemInfo.appliesTo.includes('term2_3')) {
                            term2And3Total += item.amount;
                        }
                    }
                }
            });
        }


        return { newAdmissionTotal, term1Total, term2And3Total, optionalTotal, hasStructure: true };
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
                                    <TableHead className="text-right">Optional Items Total</TableHead>
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
                                                        <TableCell className="text-right">GHS {fees.optionalTotal.toFixed(2)}</TableCell>
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
