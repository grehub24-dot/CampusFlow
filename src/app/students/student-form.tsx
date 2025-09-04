
'use client'

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from '@/lib/firebase';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Student, SchoolClass } from '@/types';

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  email: z.string().email('Please enter a valid email address.').optional().or(z.literal('')),
  dateOfBirth: z.date({ required_error: 'Date of birth is required.'}),
  gender: z.enum(['Male', 'Female']),
  admissionClassId: z.string().min(1, 'Please select a class.'),
  guardianName: z.string().min(1, "Guardian's name is required."),
  guardianPhone: z.string().min(10, 'Please enter a valid phone number.'),
  guardianEmail: z.string().email('Please enter a valid email address.').optional().or(z.literal('')),
  previousSchool: z.string().optional(),
  notes: z.string().optional(),
});

export type FormValues = z.infer<typeof formSchema>;

type StudentFormProps = {
    onSubmit: SubmitHandler<FormValues & { admissionClass: string, admissionClassCategory: string }>;
    defaultValues?: Student;
}

const categoryOrder = ['Pre-school', 'Primary', 'Junior High School'];
const preSchoolOrder = ['Creche', 'Nursery 1', 'Nursery 2', 'Kindergarten 1', 'Kindergarten 2'];


export function StudentForm({ onSubmit, defaultValues }: StudentFormProps) {
  const [classes, setClasses] = React.useState<SchoolClass[]>([]);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        firstName: defaultValues?.firstName || '',
        lastName: defaultValues?.lastName || '',
        email: defaultValues?.email || '',
        gender: defaultValues?.gender,
        admissionClassId: defaultValues?.classId || '',
        guardianName: defaultValues?.guardianName || '',
        guardianPhone: defaultValues?.guardianPhone || '',
        guardianEmail: defaultValues?.guardianEmail || '',
        previousSchool: defaultValues?.previousSchool || '',
        notes: defaultValues?.notes || '',
        dateOfBirth: defaultValues?.dateOfBirth ? new Date(defaultValues.dateOfBirth) : undefined,
    }
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

  React.useEffect(() => {
    const classesQuery = query(collection(db, "classes"));
    const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
        const classesData: SchoolClass[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
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
    return () => unsubscribeClasses();
  }, [])

  React.useEffect(() => {
    if (defaultValues) {
        form.reset({
            firstName: defaultValues.firstName,
            lastName: defaultValues.lastName,
            email: defaultValues.email || '',
            gender: defaultValues.gender,
            admissionClassId: defaultValues.classId,
            guardianName: defaultValues.guardianName,
            guardianPhone: defaultValues.guardianPhone,
            guardianEmail: defaultValues.guardianEmail || '',
            previousSchool: defaultValues.previousSchool || '',
            notes: defaultValues.notes || '',
            dateOfBirth: defaultValues.dateOfBirth ? new Date(defaultValues.dateOfBirth) : undefined,
        })
    } else {
        form.reset({
            firstName: '',
            lastName: '',
            email: '',
            gender: undefined,
            admissionClassId: '',
            guardianName: '',
            guardianPhone: '',
            guardianEmail: '',
            previousSchool: '',
            notes: '',
            dateOfBirth: undefined,
        });
    }
  }, [defaultValues, form]);
  
    const customOnSubmit: SubmitHandler<FormValues> = (values) => {
    const selectedClass = classes.find(c => c.id === values.admissionClassId);
    const enrichedValues = {
        ...values,
        admissionClass: selectedClass?.name || '', // Keep the name for display
        admissionClassCategory: selectedClass?.category || '',
    };
    onSubmit(enrichedValues);
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="john.doe@example.com" {...field} />
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
                  <FormLabel>Class</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classes.map(c => (
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
                      placeholder="Any additional information..."
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
            {defaultValues ? 'Save Changes' : 'Submit Application'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
