
'use client'

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Student, SchoolClass, Message } from '@/types';
import { getBalance, sendSms } from '@/lib/frog-api';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Wallet, ShoppingCart } from 'lucide-react';
import StatCard from '@/components/dashboard/stat-card';
import { Input } from '@/components/ui/input';

const messageFormSchema = z.object({
  recipientType: z.enum(['all', 'class', 'single']),
  classId: z.string().optional(),
  studentId: z.string().optional(),
  messageType: z.enum(['sms', 'email']),
  subject: z.string().optional(), // For email
  message: z.string().min(10, 'Message must be at least 10 characters.'),
});

type MessageFormValues = z.infer<typeof messageFormSchema>;

export default function CommunicationsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      recipientType: 'all',
      messageType: 'sms',
      message: '',
    },
  });
  
  const recipientType = form.watch('recipientType');
  const messageType = form.watch('messageType');

  useEffect(() => {
    const studentsQuery = query(collection(db, "students"));
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    });

    const classesQuery = query(collection(db, "classes"));
    const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass)));
    });

    const fetchBalance = async () => {
      try {
        const result = await getBalance();
        if (result.success) {
          setBalance(result.balance);
        } else {
          console.error("API Error fetching balance:", result.error);
          toast({
            variant: 'destructive',
            title: 'API Error',
            description: 'Could not fetch SMS credit balance.'
          });
        }
      } catch (error) {
        console.error("Failed to fetch balance:", error);
         toast({
            variant: 'destructive',
            title: 'API Error',
            description: 'Could not fetch SMS credit balance.'
          });
      }
    };

    fetchBalance();

    return () => {
      unsubscribeStudents();
      unsubscribeClasses();
    };
  }, [toast]);

  const onSubmit: SubmitHandler<MessageFormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      let recipients: string[] = [];
      if (values.recipientType === 'all') {
        recipients = students.map(s => s.guardianPhone).filter(Boolean);
      } else if (values.recipientType === 'class' && values.classId) {
        recipients = students.filter(s => s.classId === values.classId).map(s => s.guardianPhone).filter(Boolean);
      } else if (values.recipientType === 'single' && values.studentId) {
         const student = students.find(s => s.id === values.studentId);
         if (student && student.guardianPhone) recipients.push(student.guardianPhone);
      }

      const uniqueRecipients = [...new Set(recipients)];
      
      if (uniqueRecipients.length === 0) {
        toast({ variant: 'destructive', title: 'No Recipients', description: 'Could not find any valid recipients for the selected criteria.' });
        setIsSubmitting(false);
        return;
      }
      
      if (values.messageType === 'sms') {
        // In a real app, you would not send requests one by one.
        // This is for demonstration purposes. Consider batching or a different strategy.
        const promises = uniqueRecipients.slice(0, 5).map(phone => sendSms(phone, values.message));
        await Promise.all(promises);

        toast({
          title: 'Messages Sent',
          description: `SMS dispatched to ${uniqueRecipients.length} recipients. (Demo limited to 5 for now)`,
        });
      } else {
         toast({
          title: 'Not Implemented',
          description: `Email functionality is not yet connected to an API.`,
        });
      }

      form.reset();
      
    } catch (error) {
      console.error('Failed to send messages:', error);
      toast({
        variant: 'destructive',
        title: 'Error Sending Message',
        description: (error as Error).message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Communications"
        description="Send SMS and email notifications to students and guardians."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
         <StatCard 
            title="SMS Credit Balance"
            value={balance !== null ? balance.toLocaleString() : <Loader2 className="h-4 w-4 animate-spin" />}
            icon={Wallet}
            description="Your current SMS bundle"
        />
      </div>

      <Tabs defaultValue="send-message">
        <TabsList>
          <TabsTrigger value="send-message">Send Message</TabsTrigger>
          <TabsTrigger value="purchase">Purchase Bundles</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="send-message" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compose Message</CardTitle>
              <CardDescription>Select your audience and compose your message below.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="recipientType"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Recipient Group</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="all">All Students</SelectItem>
                                        <SelectItem value="class">Specific Class</SelectItem>
                                        <SelectItem value="single">Single Student</SelectItem>
                                    </SelectContent>
                                </Select>
                                </FormItem>
                            )}
                        />
                        {recipientType === 'class' && (
                             <FormField
                                control={form.control}
                                name="classId"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Select Class</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a class..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    </FormItem>
                                )}
                            />
                        )}
                        {recipientType === 'single' && (
                             <FormField
                                control={form.control}
                                name="studentId"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Select Student</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a student..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.class})</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    </FormItem>
                                )}
                            />
                        )}
                         <FormField
                            control={form.control}
                            name="messageType"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Message Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="sms">SMS</SelectItem>
                                        <SelectItem value="email">Email (Not implemented)</SelectItem>
                                    </SelectContent>
                                </Select>
                                </FormItem>
                            )}
                        />
                    </div>
                     <div className="space-y-4">
                        {messageType === 'email' && (
                           <FormField
                                control={form.control}
                                name="subject"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Subject</FormLabel>
                                    <FormControl><Input placeholder="e.g., Important School Announcement" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        )}
                        <FormField
                            control={form.control}
                            name="message"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Message</FormLabel>
                                <FormControl>
                                <Textarea
                                    placeholder="Type your message here..."
                                    className="resize-y min-h-[150px]"
                                    {...field}
                                />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                     </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Send Message
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase">
            <Card>
                <CardHeader>
                    <CardTitle>Purchase SMS/Email Bundles</CardTitle>
                    <CardDescription>Top up your credits to continue sending communications.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                    <p className="text-muted-foreground">To purchase more credits, please visit the provider's portal.</p>
                    <Button asChild>
                        <a href="https://frogdocs.wigal.com.gh" target="_blank" rel="noopener noreferrer">
                           <ShoppingCart className="mr-2 h-4 w-4"/> Go to Purchase Portal
                        </a>
                    </Button>
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="history">
            <Card>
                <CardHeader>
                    <CardTitle>Message History</CardTitle>
                    <CardDescription>A log of all communications sent from the system.</CardDescription>
                </Header>
                <CardContent>
                    <p className="text-center text-muted-foreground py-12">Message history tracking is not yet implemented.</p>
                </CardContent>
            </Card>
        </TabsContent>

      </Tabs>
    </>
  );
}
