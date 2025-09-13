
'use client'

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { collection, addDoc, onSnapshot, query, orderBy, where, doc, runTransaction, getDocs, getDoc, limit } from "firebase/firestore";


import { PageHeader } from "@/components/page-header";
import StatCard from "@/components/dashboard/stat-card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2, Users, User, Wallet, Clock, BookOpen, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Student, AcademicTerm, SchoolClass, FeeStructure, Payment, AdmissionSettings, FeeItem, CommunicationTemplate, IntegrationSettings } from '@/types';
import { AdmittedStudentTable } from './admitted-student-table';
import { ToastAction } from '@/components/ui/toast';
import { db } from '@/lib/firebase';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { StudentDetails } from '@/components/student-details';
import PaymentForm from '../payments/payment-form';
import { sendSms } from '@/lib/frog-api';
import { useSchoolInfo } from '@/context/school-info-context';


const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  dateOfBirth: z.date({ required_error: 'Date of birth is required.'}),
  gender: z.enum(['Male', 'Female']),
  admissionClassId: z.string().min(1, 'Please select a class.'),
  guardianName: z.string().min(1, "Guardian's name is required."),
  guardianPhone: z.string().min(10, 'Please enter a valid phone number.'),
  guardianEmail: z.string().email('Please enter a valid email address.').optional().or(z.literal('')),
  previousSchool: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function AdmissionForm({ onFormSubmit, classes }: { onFormSubmit: SubmitHandler<FormValues & { admissionClass: string, admissionClassCategory: string }>, classes: SchoolClass[] }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      gender: undefined,
      admissionClassId: '',
      guardianName: '',
      guardianPhone: '',
      guardianEmail: '',
      previousSchool: '',
      notes: '',
    },
  });

  const dob = form.watch('dateOfBirth');
  
  const calculateAge = (birthDate?: Date) => {
    if (!birthDate) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
  };

  const age = React.useMemo(() => calculateAge(dob), [dob]);
  
  const customOnSubmit: SubmitHandler<FormValues> = (values) => {
    const selectedClass = classes.find(c => c.id === values.admissionClassId);
    const enrichedValues = {
        ...values,
        admissionClass: selectedClass?.name || '',
        admissionClassCategory: selectedClass?.category || '',
    };
    onFormSubmit(enrichedValues);
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(customOnSubmit)} className="space-y-8">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Student Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date of Birth {age !== null && <span className="text-muted-foreground">({age} years old)</span>}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("2000-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="admissionClassId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admission Class</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="previousSchool"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Previous School (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Starbright Prep School" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Guardian Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                  control={form.control}
                  name="guardianName"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Guardian's Full Name</FormLabel>
                      <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="guardianPhone"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Guardian's Phone</FormLabel>
                      <FormControl>
                      <Input placeholder="024 123 4567" {...field} />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="guardianEmail"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Guardian's Email (Optional)</FormLabel>
                      <FormControl>
                      <Input placeholder="guardian@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                  </FormItem>
                  )}
              />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Additional Notes</h3>
          <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
              <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                  <Textarea
                      placeholder="Any additional information relevant to the application..."
                      className="resize-y"
                      {...field}
                  />
                  </FormControl>
                  <FormMessage />
              </FormItem>
              )}
          />
        </div>
        
        <div className="flex justify-end">
          <Button type="submit">
            Submit Application
          </Button>
        </div>
      </form>
    </Form>
  )
}

const categoryOrder = ['Pre-school', 'Primary', 'Junior High School'];
const preSchoolOrder = ['Creche', 'Nursery 1', 'Nursery 2', 'Kindergarten 1', 'Kindergarten 2'];

const PLAN_LIMITS = {
  free: 50,
  starter: 200,
  pro: 500,
  enterprise: Infinity,
}

export default function AdmissionsPage() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isTableLoading, setIsTableLoading] = React.useState(true);
  const [isAdmissionDialogOpen, setIsAdmissionDialogOpen] = React.useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);
  const [admittedStudents, setAdmittedStudents] = React.useState<Student[]>([]);
  const [allStudentsCount, setAllStudentsCount] = React.useState(0);
  const [currentTerm, setCurrentTerm] = React.useState<AcademicTerm | null>(null);
  const [classes, setClasses] = React.useState<SchoolClass[]>([]);
  const [feeStructures, setFeeStructures] = React.useState<FeeStructure[]>([]);
  const [feeItems, setFeeItems] = React.useState<FeeItem[]>([]);
  const [smsTemplates, setSmsTemplates] = React.useState<Record<string, CommunicationTemplate>>({});
  const [integrationSettings, setIntegrationSettings] = React.useState<IntegrationSettings | null>(null);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const { schoolInfo } = useSchoolInfo();

  React.useEffect(() => {
    // Listener for all students to get the total count
    const allStudentsQuery = query(collection(db, "students"));
    const unsubscribeAllStudents = onSnapshot(allStudentsQuery, (snapshot) => {
        setAllStudentsCount(snapshot.size);
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

    const classesQuery = query(collection(db, "classes"));
    const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
        const classesData: SchoolClass[] = [];
        snapshot.forEach((doc) => {
            classesData.push({ id: doc.id, ...doc.data() } as SchoolClass);
        });
        const sortedData = classesData.sort((a, b) => {
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
    });
    
    const feeStructuresQuery = collection(db, "fee-structures");
    const unsubscribeFeeStructures = onSnapshot(feeStructuresQuery, (snapshot) => {
      const feeStructuresData: FeeStructure[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeStructure));
      setFeeStructures(feeStructuresData);
    });

    const feeItemsQuery = query(collection(db, "fee-items"));
    const unsubscribeFeeItems = onSnapshot(feeItemsQuery, (snapshot) => {
        setFeeItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeeItem)));
    });

    const smsTemplatesRef = collection(db, "settings", "templates", "sms");
    const unsubscribeSmsTemplates = onSnapshot(smsTemplatesRef, (snapshot) => {
        const fetchedTemplates: Record<string, CommunicationTemplate> = {};
        snapshot.forEach((doc) => {
            fetchedTemplates[doc.id] = { id: doc.id, ...doc.data() } as CommunicationTemplate;
        });
        setSmsTemplates(fetchedTemplates);
    });
    
    const paymentsQuery = collection(db, "payments");
    const unsubscribePayments = onSnapshot(paymentsQuery, (querySnapshot) => {
      const paymentsData: Payment[] = [];
      querySnapshot.forEach((doc) => {
        paymentsData.push({ id: doc.id, ...doc.data() } as Payment);
      });
      setPayments(paymentsData);
    });

    const integrationsSettingsRef = doc(db, "settings", "integrations");
    const unsubscribeIntegrations = onSnapshot(integrationsSettingsRef, (doc) => {
        setIntegrationSettings(doc.data() as IntegrationSettings);
    });

    return () => {
      unsubscribeAllStudents();
      unsubscribeSettings();
      unsubscribeClasses();
      unsubscribeFeeStructures();
      unsubscribePayments();
      unsubscribeFeeItems();
      unsubscribeSmsTemplates();
      unsubscribeIntegrations();
    }
  }, []);

  const studentsWithStatus = React.useMemo(() => {
    if (!currentTerm || feeItems.length === 0 || feeStructures.length === 0) {
      return admittedStudents.map(s => ({ ...s, paymentStatus: 'Pending' as const }));
    }

    return admittedStudents.map(student => {
      const structure = feeStructures.find(fs => fs.classId === student.classId && fs.academicTermId === currentTerm.id);
      if (!structure || !Array.isArray(structure.items)) {
        return { ...student, paymentStatus: 'Unpaid' as const };
      }

      const totalDue = structure.items
        .map(item => {
          const feeItemInfo = feeItems.find(fi => fi.id === item.feeItemId);
          if (!feeItemInfo || feeItemInfo.isOptional) return 0;
          return feeItemInfo.appliesTo.includes('new') ? item.amount : 0;
        })
        .reduce((total, amount) => total + amount, 0);

      if (totalDue === 0) {
        return { ...student, paymentStatus: 'Paid' as const };
      }

      const totalPaid = payments
        .filter(p => p.studentId === student.id && p.academicYear === currentTerm.academicYear && p.term === currentTerm.session)
        .reduce((sum, p) => sum + p.amount, 0);

      let status: 'Paid' | 'Part-Payment' | 'Unpaid';
      if (totalPaid >= totalDue) {
        status = 'Paid';
      } else if (totalPaid > 0) {
        status = 'Part-Payment';
      } else {
        status = 'Unpaid';
      }
      
      return { ...student, paymentStatus: status };
    });
  }, [admittedStudents, payments, feeStructures, feeItems, currentTerm]);


  React.useEffect(() => {
    if (!currentTerm) {
      setAdmittedStudents([]);
      setIsTableLoading(false);
      return;
    }
    
    setIsTableLoading(true);
    const q = query(
        collection(db, "students"), 
        where("admissionYear", "==", currentTerm.academicYear),
        where("admissionTerm", "==", currentTerm.session)
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const students: Student[] = [];
      querySnapshot.forEach((doc) => {
        students.push({ id: doc.id, ...doc.data() } as Student);
      });
      // Sort client-side
      students.sort((a, b) => (b.admissionId || "").localeCompare(a.admissionId || ""));
      setAdmittedStudents(students);
      setIsTableLoading(false);
    }, (error) => {
      console.error("Error fetching students:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch students from the database. A required index is likely missing.",
      });
      setIsTableLoading(false);
    });

    return () => unsubscribe();
  }, [currentTerm, toast]);


  const onSubmit: SubmitHandler<FormValues & { admissionClass: string, admissionClassCategory: string }> = async (values) => {
    setIsSubmitting(true);
    if (!currentTerm) {
        toast({
            variant: "destructive",
            title: "No Active Term",
            description: "Cannot add a student because no academic term is set as current.",
        });
        setIsSubmitting(false);
        return;
    }

    try {
        const newStudentDocRef = doc(collection(db, "students")); 

        await runTransaction(db, async (transaction) => {
            const studentsCollectionRef = collection(db, "students");
            const prefix = "CEC-";

            const allStudentsSnapshot = await getDocs(query(studentsCollectionRef));
            
            let maxNumber = 0;
            allStudentsSnapshot.forEach(doc => {
                const lastAdmissionId = doc.data().admissionId as string;
                if (lastAdmissionId && lastAdmissionId.startsWith(prefix)) {
                    const lastNumberMatch = lastAdmissionId.match(/(\d+)$/);
                    if (lastNumberMatch) {
                        const currentNum = parseInt(lastNumberMatch[0], 10);
                        if (currentNum > maxNumber) {
                            maxNumber = currentNum;
                        }
                    }
                }
            });
            const nextNumber = maxNumber + 1;
            
            const admissionId = `${prefix}${String(nextNumber).padStart(4, '0')}`;

            const newStudentData = {
                name: `${values.firstName} ${values.lastName}`,
                admissionId: admissionId,
                class: values.admissionClass,
                classId: values.admissionClassId,
                classCategory: values.admissionClassCategory,
                gender: values.gender,
                status: 'Active' as const,
                paymentStatus: 'Unpaid' as const,
                email: `${values.firstName.toLowerCase()}.${values.lastName.toLowerCase()}@example.com`,
                admissionDate: new Date().toISOString(),
                admissionTerm: currentTerm.session,
                admissionYear: currentTerm.academicYear,
                dateOfBirth: values.dateOfBirth.toISOString(),
                firstName: values.firstName,
                lastName: values.lastName,
                guardianName: values.guardianName,
                guardianPhone: values.guardianPhone,
                guardianEmail: values.guardianEmail,
                previousSchool: values.previousSchool,
                notes: values.notes,
            };

            transaction.set(newStudentDocRef, newStudentData);
        });

        toast({
            title: 'Application Submitted',
            description: `${values.firstName} ${values.lastName}'s application has been successfully submitted.`,
        });
        
        setIsAdmissionDialogOpen(false);

        const newStudentSnapshot = await getDoc(newStudentDocRef);
        const newStudent = { id: newStudentSnapshot.id, ...newStudentSnapshot.data() } as Student;
        
        // --- Calculate fees and send SMS ---
        if (integrationSettings?.smsOnAdmission) {
            const structure = feeStructures.find(fs => fs.classId === newStudent.classId && fs.academicTermId === currentTerm.id);
            if (structure && Array.isArray(structure.items)) {
                const totalFeesDue = structure.items
                    .map(item => {
                        const feeItemInfo = feeItems.find(fi => fi.id === item.feeItemId);
                        if (!feeItemInfo || feeItemInfo.isOptional) return 0;
                        return feeItemInfo.appliesTo.includes('new') ? item.amount : 0;
                    })
                    .reduce((total, amount) => total + amount, 0);

                const template = smsTemplates['welcome-message'];
                if (template && template.content && newStudent.guardianPhone) {
                    let message = template.content
                        .replace('{{studentName}}', newStudent.name)
                        .replace('{{schoolName}}', schoolInfo?.schoolName || 'the school')
                        .replace('{{className}}', newStudent.class)
                        .replace('{{feesDue}}', totalFeesDue.toFixed(2));
                    
                    sendSms([newStudent.guardianPhone], message).then(result => {
                        if (result.success) {
                            toast({ title: 'Welcome SMS Sent', description: 'Guardian has been notified.' });
                        } else {
                            toast({ variant: 'destructive', title: 'SMS Failed', description: 'Could not send welcome SMS to guardian.' });
                        }
                    });
                }
            }
        }
        // --- End of SMS logic ---


        const newStudentForPayment: Student = {
            ...newStudent,
            isNewAdmission: true,
            currentTermNumber: parseInt(currentTerm.session.split(' ')[0], 10)
        }
        setSelectedStudent(newStudentForPayment);
        setIsPaymentDialogOpen(true);

    } catch (error) {
        console.error("Error adding document: ", error);
        toast({
            variant: "destructive",
            title: "Submission Error",
            description: "Could not save the application. Please try again.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleViewApplication = (student: Student) => {
    setSelectedStudent(student);
    setIsSheetOpen(true);
  }

  const handlePay = (student: Student) => {
    if (currentTerm) {
        const studentForPayment = {
            ...student,
            isNewAdmission: student.admissionTerm === currentTerm.session && student.admissionYear === currentTerm.academicYear,
            currentTermNumber: parseInt(currentTerm.session.split(' ')[0], 10)
        }
        setSelectedStudent(studentForPayment);
    } else {
        setSelectedStudent(student);
    }
    setIsPaymentDialogOpen(true);
  }
  
  const handleAddNewStudentClick = () => {
    const limit = PLAN_LIMITS[schoolInfo?.currentPlan || 'free'];
    if (allStudentsCount >= limit) {
        toast({
            variant: "destructive",
            title: "Student Limit Reached",
            description: `You have reached the ${limit} student limit for the ${schoolInfo?.currentPlan} plan.`,
            action: <ToastAction altText="Upgrade" asChild><Button variant="link" onClick={() => router.push('/billing')}>Upgrade Plan</Button></ToastAction>
        });
    } else {
        setIsAdmissionDialogOpen(true);
    }
  }

  const admissionStats = {
    totalPayments: studentsWithStatus.filter(s => s.paymentStatus === 'Paid' || s.paymentStatus === 'Part-Payment').reduce((acc, student) => {
        const studentPayments = payments.filter(p => p.studentId === student.id);
        return acc + studentPayments.reduce((sum, p) => sum + p.amount, 0);
    }, 0),
  };

  return (
    <>
      <PageHeader
        title="Admissions"
        description={`Manage student applications for the current term (${currentTerm?.session || ''} ${currentTerm?.academicYear || ''}).`}
      >
        <Dialog open={isAdmissionDialogOpen} onOpenChange={setIsAdmissionDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNewStudentClick}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Student
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>New Student Application Form</DialogTitle>
              <DialogDescription>Fill out the details below to submit a new application.</DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto p-1">
              <AdmissionForm onFormSubmit={onSubmit} classes={classes} />
            </div>
            {isSubmitting && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
         <StatCard 
            title="Total New Admissions"
            value={admittedStudents.length.toLocaleString()}
            icon={Users}
            color="text-indigo-500"
            description="For the current term"
        />
        <StatCard 
            title="Total Payments"
            value={`GHS ${admissionStats.totalPayments.toLocaleString()}`}
            icon={Wallet}
            color="text-green-500"
            description="Based on new admissions"
        />
        <StatCard 
            title="Male Students"
            value={admittedStudents.filter(s => s.gender === 'Male').length.toLocaleString()}
            icon={User}
            color="text-blue-500"
        />
        <StatCard 
            title="Female Students"
            value={admittedStudents.filter(s => s.gender === 'Female').length.toLocaleString()}
            icon={User}
            color="text-pink-500"
        />
      </div>
      
      <div className="space-y-6">
        <AdmittedStudentTable data={studentsWithStatus} onViewApplication={handleViewApplication} onPay={handlePay} />
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Applicant Details</SheetTitle>
          </SheetHeader>
          {selectedStudent && <StudentDetails student={selectedStudent} />}
        </SheetContent>
      </Sheet>

       <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Record New Payment</DialogTitle>
              <DialogDescription>Fill out the form below to record a new financial transaction.</DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto p-1">
                {currentTerm && selectedStudent && (
                  <PaymentForm 
                    students={[selectedStudent]} 
                    feeStructures={feeStructures}
                    payments={payments}
                    currentTerm={currentTerm}
                    onSuccess={() => setIsPaymentDialogOpen(false)}
                    defaultStudentId={selectedStudent.id}
                  />
                )}
            </div>
          </DialogContent>
        </Dialog>
    </>
  );
}
