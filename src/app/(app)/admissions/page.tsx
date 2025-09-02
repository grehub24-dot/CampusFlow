
'use client'

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { collection, addDoc, onSnapshot, query, orderBy } from "firebase/firestore";


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
import type { Student } from '@/types';
import { AdmittedStudentTable } from './admitted-student-table';
import { columns } from './columns';
import { ToastAction } from '@/components/ui/toast';
import { db } from '@/lib/firebase';


const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  dateOfBirth: z.date({ required_error: 'Date of birth is required.'}),
  gender: z.enum(['Male', 'Female']),
  admissionClass: z.string().min(1, 'Please select a class.'),
  guardianName: z.string().min(1, "Guardian's name is required."),
  guardianPhone: z.string().min(10, 'Please enter a valid phone number.'),
  guardianEmail: z.string().email('Please enter a valid email address.').optional().or(z.literal('')),
  previousSchool: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function AdmissionForm({ onFormSubmit, isSubmitting }: { onFormSubmit: SubmitHandler<FormValues>, isSubmitting: boolean }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      admissionClass: '',
      guardianName: '',
      guardianPhone: '',
      guardianEmail: '',
      previousSchool: '',
      notes: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-8">
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
                  <FormLabel>Date of Birth</FormLabel>
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
              name="admissionClass"
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
                      {Array.from({length: 12}, (_, i) => (
                          <SelectItem key={i+1} value={`Grade ${i + 1}`}>{`Grade ${i + 1}`}</SelectItem>
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Application
          </Button>
        </div>
      </form>
    </Form>
  )
}

export default function AdmissionsPage() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isTableLoading, setIsTableLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [admittedStudents, setAdmittedStudents] = React.useState<Student[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  React.useEffect(() => {
    setIsTableLoading(true);
    const q = query(collection(db, "students"), orderBy("admissionDate", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const students: Student[] = [];
      querySnapshot.forEach((doc) => {
        students.push({ id: doc.id, ...doc.data() } as Student);
      });
      setAdmittedStudents(students);
      setIsTableLoading(false);
    }, (error) => {
      console.error("Error fetching students:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch students from the database.",
      });
      setIsTableLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);


  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
        const studentId = `STU-${Date.now()}`;
        const newStudentData = {
            id: studentId,
            name: `${values.firstName} ${values.lastName}`,
            class: values.admissionClass,
            gender: values.gender,
            status: 'Active',
            email: `${values.firstName.toLowerCase()}.${values.lastName.toLowerCase()}@example.com`,
            admissionDate: new Date().toISOString(),
            ...values,
            dateOfBirth: values.dateOfBirth.toISOString(),
        };

        await addDoc(collection(db, "students"), newStudentData);
        
        setIsSubmitting(false);
        setIsDialogOpen(false);

        toast({
        title: 'Application Submitted',
        description: `${values.firstName} ${values.lastName}'s application has been successfully submitted.`,
        action: (
            <ToastAction altText="Proceed to payment" onClick={() => router.push('/payments')}>
                Proceed to Payment
            </ToastAction>
        )
        });

    } catch (error) {
        setIsSubmitting(false);
        console.error("Error adding document: ", error);
        toast({
            variant: "destructive",
            title: "Submission Error",
            description: "Could not save the application. Please try again.",
        });
    }
  };

  const admissionStats = {
    totalPayments: 76000,
    pendingInvoices: 5000,
  };

  return (
    <>
      <PageHeader
        title="Admissions"
        description="Review newly admitted students and manage applications."
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
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
              <AdmissionForm onFormSubmit={onSubmit} isSubmitting={isSubmitting} />
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard 
            title="Academic Year"
            value="2023-2024"
            icon={CalendarIcon}
        />
        <StatCard 
            title="Current Session"
            value="1st Term"
            icon={BookOpen}
        />
         <StatCard 
            title="Total New Admissions"
            value={admittedStudents.length.toLocaleString()}
            icon={Users}
        />
        <StatCard 
            title="Total Payments"
            value={`GHS ${admissionStats.totalPayments.toLocaleString()}`}
            icon={Wallet}
            description="Based on new admissions"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3 mb-6">
       
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
        <StatCard 
            title="Pending Invoices"
            value={`GHS ${admissionStats.pendingInvoices.toLocaleString()}`}
            icon={Clock}
            description="For new admissions"
        />
      </div>

      <div className="space-y-6">
        <AdmittedStudentTable columns={columns} data={admittedStudents} />
      </div>
    </>
  );
}

    