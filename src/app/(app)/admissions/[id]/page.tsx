
'use client'

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student } from '@/types';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Book, Calendar, Phone, Mail, Home } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | undefined }) => (
    <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-muted-foreground mt-1" />
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-medium">{value || 'N/A'}</p>
        </div>
    </div>
);


export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [student, setStudent] = React.useState<Student | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) return;
    const fetchStudent = async () => {
      setIsLoading(true);
      const docRef = doc(db, 'students', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setStudent({ id: docSnap.id, ...docSnap.data() } as Student);
      } else {
        console.log('No such document!');
      }
      setIsLoading(false);
    };

    fetchStudent();
  }, [id]);

  if (isLoading) {
    return (
        <div>
            <PageHeader title="Applicant Details">
                <Skeleton className="h-10 w-24" />
            </PageHeader>
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-6 w-32" />
                    </div>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                        <div className="flex items-start gap-3" key={i}>
                            <Skeleton className="h-8 w-8 rounded-sm" />
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-6 w-32" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!student) {
    return <div>Student not found.</div>;
  }
  
  const fallback = student.name.split(' ').map(n => n[0]).join('');

  return (
    <>
      <PageHeader title="Applicant Details" description={`Viewing application for ${student.name}`}>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admissions
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
            <div className="flex items-center gap-4">
                 <Avatar className="h-24 w-24">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.name}`} />
                    <AvatarFallback className="text-3xl">{fallback}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-3xl">{student.name}</CardTitle>
                    <CardDescription className="mt-1">
                        Application for <span className="font-semibold">{student.class}</span>
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
                    <DetailItem icon={Calendar} label="Admission Date" value={student.admissionDate ? format(new Date(student.admissionDate), 'PPP') : 'N/A'} />
                    <DetailItem icon={Book} label="Previous School" value={student.previousSchool} />
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
    </>
  );
}

