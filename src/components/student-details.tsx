
'use client'

import React from 'react';
import type { Student } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Book, Calendar, Phone, Mail, Home, BadgeInfo, BookOpen, Cake, Wallet, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';


const DetailItem = ({ icon: Icon, label, value, children }: { icon: React.ElementType, label: string, value?: string | undefined | null | number, children?: React.ReactNode }) => (
    <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-muted-foreground mt-1" />
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            {value && <p className="font-medium">{value}</p>}
            {children && <div className="font-medium">{children}</div>}
        </div>
    </div>
);

interface StudentDetailsProps {
    student: Student;
}

export function StudentDetails({ student }: StudentDetailsProps) {
  if (!student) {
    return <div>Loading...</div>;
  }
  
  const fallback = student.name.split(' ').map(n => n[0]).join('');

  const statusVariant = {
      "Active": "default",
      "Inactive": "secondary",
      "Graduated": "outline",
    }[student.status] ?? "default" as "default" | "secondary" | "destructive" | "outline" | null | undefined;
  
   const paymentStatusVariant = {
        "Paid": "default",
        "Part-Payment": "outline",
        "Pending": "secondary",
        "Unpaid": "destructive",
      }[student.paymentStatus || 'Pending'] ?? "secondary" as "default" | "secondary" | "destructive" | "outline" | null | undefined;

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
  };

  return (
    <div className="p-1 pt-4">
      <Card>
        <CardHeader>
            <div className="flex flex-col md:flex-row items-start gap-6">
                 <Avatar className="h-24 w-24">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.name}`} />
                    <AvatarFallback className="text-3xl">{fallback}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center gap-4">
                        <CardTitle className="text-3xl">{student.name}</CardTitle>
                        {student.status && <Badge variant={statusVariant}>{student.status}</Badge>}
                    </div>
                    <CardDescription className="mt-1">
                        <span className="font-semibold">{student.class}</span>
                        {student.admissionId && <span className="text-muted-foreground"> • ID: {student.admissionId}</span>}
                    </CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-8">
            <div>
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">Personal Information</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DetailItem icon={User} label="Gender" value={student.gender} />
                    <DetailItem icon={Calendar} label="Date of Birth" value={student.dateOfBirth ? format(new Date(student.dateOfBirth), 'PPP') : 'N/A'} />
                    <DetailItem icon={Cake} label="Age" value={student.dateOfBirth ? `${calculateAge(student.dateOfBirth)} years old` : 'N/A'} />
                    <DetailItem icon={Mail} label="Email Address" value={student.email} />
                    <DetailItem icon={Book} label="Previous School" value={student.previousSchool} />
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">Academic Information</h3>
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DetailItem icon={Hash} label="Admission ID" value={student.admissionId} />
                    <DetailItem icon={BookOpen} label="Admission Term" value={`${student.admissionTerm || 'N/A'}, ${student.admissionYear || 'N/A'}`} />
                    <DetailItem icon={Calendar} label="Admission Date" value={student.admissionDate ? format(new Date(student.admissionDate), 'PPP') : 'N/A'} />
                    <DetailItem icon={Wallet} label="Payment Status">
                        <Badge variant={paymentStatusVariant} className="capitalize">{student.paymentStatus || 'Pending'}</Badge>
                    </DetailItem>
                 </div>
            </div>

             <div>
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">Guardian Information</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DetailItem icon={User} label="Guardian's Name" value={student.guardianName} />
                    <DetailItem icon={Phone} label="Guardian's Phone" value={student.guardianPhone} />
                    <DetailItem icon={Mail} label="Guardian's Email" value={student.guardianEmail} />
                </div>
            </div>

            {student.notes && (
                <div>
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Additional Notes</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{student.notes}</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
