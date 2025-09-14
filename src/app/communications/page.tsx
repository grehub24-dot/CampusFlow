

'use client'

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, onSnapshot, query, where, orderBy, doc, setDoc, getDoc, writeBatch } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Student, SchoolClass, Message, Invoice as InvoiceType, MomoProvider, CommunicationTemplate, Bundle, IntegrationSettings } from '@/types';
import { sendSms, generateVerificationCode, verifyOtp } from '@/lib/frog-api';
import { processEmailQueue } from '@/lib/email-sender';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Wallet, ShoppingCart, ArrowLeft, Smartphone, CreditCard, CheckCircle, Mail, MessageSquare } from 'lucide-react';
import StatCard from '@/components/dashboard/stat-card';
import { Input } from '@/components/ui/input';
import { MessageHistory } from './message-history';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ToastAction } from '@/components/ui/toast';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSchoolInfo } from '@/context/school-info-context';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const messageFormSchema = z.object({
  recipientType: z.enum(['all', 'class', 'single', 'manual']),
  classId: z.string().optional(),
  studentId: z.string().optional(),
  manualPhone: z.string().optional(),
  messageType: z.enum(['sms', 'email', 'whatsapp']),
  templateId: z.string().optional(),
  subject: z.string().optional(), // For email
  message: z.string().min(10, 'Message must be at least 10 characters.'),
}).refine(data => {
    if (data.recipientType === 'manual') {
        if (data.messageType === 'sms' || data.messageType === 'whatsapp') {
            return !!data.manualPhone && data.manualPhone.length > 0;
        }
        if (data.messageType === 'email') {
            return !!data.manualPhone && data.manualPhone.includes('@');
        }
    }
    return true;
}, {
    message: 'A valid phone number or email is required for manual entry.',
    path: ['manualPhone'],
}).refine(data => {
    if (data.messageType === 'email') {
        return !!data.subject && data.subject.length > 0;
    }
    return true;
}, {
    message: 'Subject is required for email messages.',
    path: ['subject'],
});

type MessageFormValues = z.infer<typeof messageFormSchema>;

const categoryOrder = ['Pre-school', 'Primary', 'Junior High School'];
const preSchoolOrder = ['Creche', 'Nursery 1', 'Nursery 2', 'Kindergarten 1', 'Kindergarten 2'];

const smsBundles: Bundle[] = [
  { name: "Test", msgCount: 10, price: 2, validity: 1 },
  { name: "Starter", msgCount: 100, price: 30, validity: 30 },
  { name: "Basic", msgCount: 500, price: 45, validity: 30 },
  { name: "Plus", msgCount: 1000, price: 80, validity: 60 },
  { name: "Pro", msgCount: 5000, price: 350, validity: 90 },
  { name: "Mega", msgCount: 10000, price: 600, validity: 180 },
];

function PurchaseDialogContent() {
    const router = useRouter();

    const handleSelectBundle = async (bundle: Bundle) => {
        router.push(`/billing/purchase?bundle=${bundle.name}&credits=${bundle.msgCount}&price=${bundle.price}`);
    };
    
    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Buy SMS Credit Bundle</DialogTitle>
                <DialogDescription>
                    Choose a bundle that fits your needs. Credits do not expire.
                </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
                {smsBundles.map((bundle) => (
                    <Card key={bundle.name} className="flex flex-col text-center hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle>{bundle.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col justify-between">
                            <div>
                                <p className="text-2xl font-bold">{bundle.msgCount.toLocaleString()}</p>
                                <p className="text-muted-foreground">SMS credits</p>
                                <p className="text-lg font-semibold my-2">GHS {bundle.price}</p>
                            </div>
                            <Button className="w-full mt-4" onClick={() => handleSelectBundle(bundle)}>
                                Buy Now
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </DialogContent>
    )
}

export default function CommunicationsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<Record<string, CommunicationTemplate>>({});
  const [emailTemplates, setEmailTemplates] = useState<Record<string, CommunicationTemplate>>({});
  const [balance, setBalance] = useState<number>(0); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { schoolInfo } = useSchoolInfo();
  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings | null>(null);

  const { toast } = useToast();

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: {
      recipientType: 'all',
      messageType: 'sms',
      message: '',
      classId: '',
      studentId: '',
      manualPhone: '',
      templateId: '',
      subject: '',
    },
  });
  
  const recipientType = form.watch('recipientType');
  const messageType = form.watch('messageType');
  const templateId = form.watch('templateId');

  useEffect(() => {
    if (templateId) {
      if (messageType === 'sms' && smsTemplates[templateId]) {
        form.setValue('message', smsTemplates[templateId].content);
        if (smsTemplates[templateId].name) {
          form.setValue('subject', smsTemplates[templateId].name);
        }
      } else if (messageType === 'email' && emailTemplates[templateId]) {
        form.setValue('message', emailTemplates[templateId].content);
        if (emailTemplates[templateId].name) {
          form.setValue('subject', emailTemplates[templateId].name);
        }
      }
    }
  }, [templateId, messageType, smsTemplates, emailTemplates, form]);

  useEffect(() => {
    const studentsQuery = query(collection(db, "students"));
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    });

    const classesQuery = query(collection(db, "classes"));
    const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
      const classesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
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

    const messagesQuery = query(collection(db, 'messages'), orderBy('sentDate', 'desc'));
    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    });
    
    const smsTemplatesRef = collection(db, "settings", "templates", "sms");
    const unsubscribeSmsTemplates = onSnapshot(smsTemplatesRef, (snapshot) => {
        const fetchedTemplates: Record<string, CommunicationTemplate> = {};
        snapshot.forEach((doc) => {
            fetchedTemplates[doc.id] = { id: doc.id, ...doc.data() } as CommunicationTemplate;
        });
        setSmsTemplates(fetchedTemplates);
    });

    const emailTemplatesRef = collection(db, "settings", "templates", "email");
    const unsubscribeEmailTemplates = onSnapshot(emailTemplatesRef, (snapshot) => {
        const fetchedTemplates: Record<string, CommunicationTemplate> = {};
        snapshot.forEach((doc) => {
            fetchedTemplates[doc.id] = { id: doc.id, ...doc.data() } as CommunicationTemplate;
        });
        setEmailTemplates(fetchedTemplates);
    });
    
    const billingSettingsRef = doc(db, "settings", "billing");
    const unsubscribeBilling = onSnapshot(billingSettingsRef, async (doc) => {
      if (doc.exists()) {
        setBalance(doc.data().smsBalance || 0);
      } else {
        // If the document doesn't exist, create it with a default balance of 10.
        await setDoc(billingSettingsRef, { smsBalance: 10 });
        setBalance(10);
      }
    });

    const integrationsSettingsRef = doc(db, "settings", "integrations");
    const unsubscribeIntegrations = onSnapshot(integrationsSettingsRef, (doc) => {
        setIntegrationSettings(doc.data() as IntegrationSettings);
    });


    return () => {
      unsubscribeStudents();
      unsubscribeClasses();
      unsubscribeMessages();
      unsubscribeSmsTemplates();
      unsubscribeEmailTemplates();
      unsubscribeBilling();
      unsubscribeIntegrations();
    };
  }, []);

  const onSubmit: SubmitHandler<MessageFormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      let recipients: string[] = [];
      if (values.messageType === 'sms' || values.messageType === 'whatsapp') {
        if (values.recipientType === 'all') {
            recipients = students.map(s => s.guardianPhone).filter(Boolean);
        } else if (values.recipientType === 'class' && values.classId) {
            recipients = students.filter(s => s.classId === values.classId).map(s => s.guardianPhone).filter(Boolean);
        } else if (values.recipientType === 'single' && values.studentId) {
            const student = students.find(s => s.id === values.studentId);
            if (student && student.guardianPhone) recipients.push(student.guardianPhone);
        } else if (values.recipientType === 'manual' && values.manualPhone) {
            recipients.push(values.manualPhone);
        }
      } else { // Email
         if (values.recipientType === 'all') {
            recipients = students.map(s => s.guardianEmail).filter(email => !!email && email.includes('@'));
        } else if (values.recipientType === 'class' && values.classId) {
            recipients = students.filter(s => s.classId === values.classId).map(s => s.guardianEmail).filter(email => !!email && email.includes('@'));
        } else if (values.recipientType === 'single' && values.studentId) {
            const student = students.find(s => s.id === values.studentId);
            if (student && student.guardianEmail && student.guardianEmail.includes('@')) recipients.push(student.guardianEmail);
        } else if (values.recipientType === 'manual' && values.manualPhone) {
            recipients.push(values.manualPhone);
        }
      }

      const uniqueRecipients = [...new Set(recipients)];
      
      if (uniqueRecipients.length === 0) {
        toast({ variant: 'destructive', title: 'No Recipients', description: 'Could not find any valid recipients for the selected criteria.' });
        setIsSubmitting(false);
        return;
      }
      
      if (values.messageType === 'sms') {
        if (balance < uniqueRecipients.length) {
            toast({
              variant: 'destructive',
              title: 'Insufficient Credit',
              description: `You need ${uniqueRecipients.length} credits but only have ${balance}. You are out of credit.`,
              action: <ToastAction altText="Buy Credit" asChild><Link href="/billing">Buy Credit</Link></ToastAction>,
            });
            setIsSubmitting(false);
            return;
        }

        await sendSms(uniqueRecipients, values.message);
        
        const newBalance = balance - uniqueRecipients.length;
        const billingSettingsRef = doc(db, "settings", "billing");
        await setDoc(billingSettingsRef, { smsBalance: newBalance }, { merge: true });

        toast({
          title: 'Messages Sent',
          description: `SMS dispatched to ${uniqueRecipients.length} recipients.`,
        });
      } else if (values.messageType === 'email') {
        if (schoolInfo?.currentPlan === 'free' || schoolInfo?.currentPlan === 'starter') {
            toast({
                variant: 'destructive',
                title: 'Feature Not Available',
                description: 'Email notifications are not available on your current plan.',
                action: <ToastAction altText="Upgrade" asChild><Link href="/billing">Upgrade Plan</Link></ToastAction>
            });
            setIsSubmitting(false);
            return;
        }
        // Save to 'queuedEmails' collection
        const batch = writeBatch(db);
        uniqueRecipients.forEach(email => {
            const mailRef = doc(collection(db, "queuedEmails"));
            batch.set(mailRef, {
                to: email,
                subject: values.subject,
                html: values.message.replace(/\n/g, '<br>'),
                status: 'queued',
                createdAt: new Date().toISOString(),
            });
        });
        await batch.commit();

        toast({
          title: 'Emails Queued',
          description: `Emails for ${uniqueRecipients.length} recipients are being processed.`,
        });

        // Trigger the email processing
        processEmailQueue().then(result => {
            if (result.success) {
                toast({ title: 'Email Queue Processed', description: result.message });
            } else {
                toast({ variant: 'destructive', title: 'Email Processing Failed', description: result.message });
            }
        });

      } else if (values.messageType === 'whatsapp') {
        const res = await fetch('/api/send-whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipients: uniqueRecipients, message: values.message }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to send WhatsApp messages.');
        }

        const resultData = await res.json();
        toast({
          title: 'WhatsApp Messages Sent',
          description: resultData.message || `Messages queued for ${uniqueRecipients.length} recipients.`,
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
  
  const currentTemplates = messageType === 'sms' ? smsTemplates : emailTemplates;
  const emailDisabled = schoolInfo?.currentPlan === 'free' || schoolInfo?.currentPlan === 'starter';
  const smsDisabled = schoolInfo?.currentPlan === 'free';
  
  const whatsAppPlanDisabled = schoolInfo?.currentPlan !== 'pro' && schoolInfo?.currentPlan !== 'enterprise';
  const whatsAppConfigured = !!(integrationSettings?.whatsappAccessToken && integrationSettings?.whatsappPhoneNumberId);
  const whatsAppSendDisabled = isSubmitting || whatsAppPlanDisabled || !whatsAppConfigured;


  return (
    <>
      <PageHeader
        title="Communications"
        description="Send SMS and email notifications to students and guardians."
      >
        <Dialog>
            <DialogTrigger asChild>
                <Button disabled={smsDisabled}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Buy SMS Credit
                </Button>
            </DialogTrigger>
            <PurchaseDialogContent />
        </Dialog>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
         <StatCard 
            title="SMS Credit Balance"
            value={smsDisabled ? 'N/A' : balance.toLocaleString()}
            icon={Wallet}
            color={smsDisabled ? "text-muted-foreground" : "text-green-500"}
            description={smsDisabled ? (
                <Button variant="link" asChild className="p-0 h-auto text-xs"><Link href="/billing">Upgrade Plan</Link></Button>
             ) : "Remaining SMS units"}
        />
        <StatCard
            title="WhatsApp Messaging"
            value={whatsAppPlanDisabled ? 'Disabled' : 'Enabled'}
            icon={MessageSquare}
            color={whatsAppPlanDisabled ? 'text-muted-foreground' : 'text-green-500'}
            description={
              whatsAppPlanDisabled ? (
                <Button variant="link" asChild className="p-0 h-auto text-xs"><Link href="/billing">Upgrade to Pro</Link></Button>
              ) : 'Available'
            }
        />
        {(emailDisabled) && (
          <Alert className="md:col-span-2">
              <Mail className="h-4 w-4" />
              <AlertTitle>Upgrade to Unlock More Features</AlertTitle>
              <AlertDescription>
                {emailDisabled && 'Email notifications are not included in your current plan. '}
                <Button variant="link" asChild className="p-0 h-auto ml-1"><Link href="/billing">Upgrade Plan</Link></Button>
              </AlertDescription>
          </Alert>
        )}
      </div>

      <Tabs defaultValue="send-message">
        <TabsList>
          <TabsTrigger value="send-message">Send Message</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="send-message" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compose Message</CardTitle>
              <CardDescription>
                Select your audience and compose your message below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                       <FormField
                        control={form.control}
                        name="recipientType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recipient Group</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a recipient group..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="all">All Students</SelectItem>
                                <SelectItem value="class">Specific Class</SelectItem>
                                <SelectItem value="single">Single Student</SelectItem>
                                <SelectItem value="manual">Manual Entry</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      {recipientType === "class" && (
                        <FormField
                          control={form.control}
                          name="classId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Select Class</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a class..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {classes.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      )}
                      {recipientType === "single" && (
                        <FormField
                          control={form.control}
                          name="studentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Select Student</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a student..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {students.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.name} ({s.class})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      )}
                      {recipientType === "manual" && (
                        <FormField
                          control={form.control}
                          name="manualPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{messageType === 'sms' || messageType === 'whatsapp' ? 'Phone Number' : 'Email Address'}</FormLabel>
                              <FormControl>
                                <Input placeholder={messageType === 'sms' || messageType === 'whatsapp' ? 'Enter phone number' : 'Enter email address'} {...field} />
                              </FormControl>
                              <FormMessage />
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
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                form.setValue('templateId', '');
                                form.setValue('message', '');
                                form.setValue('subject', '');
                              }}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="sms" disabled={smsDisabled}>SMS</SelectItem>
                                <SelectItem value="email" disabled={emailDisabled}>Email</SelectItem>
                                <SelectItem value="whatsapp" disabled={whatsAppPlanDisabled}>WhatsApp</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <FormField
                          control={form.control}
                          name="templateId"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Select Template (Optional)</FormLabel>
                              <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              >
                              <FormControl>
                                  <SelectTrigger>
                                  <SelectValue placeholder="Load a message from a template..." />
                                  </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                  {Object.values(currentTemplates).map((t) => (
                                  <SelectItem key={t.id} value={t.id}>
                                      {t.name}
                                  </SelectItem>
                                  ))}
                              </SelectContent>
                              </Select>
                          </FormItem>
                          )}
                      />
                      {messageType === "email" && (
                        <FormField
                          control={form.control}
                          name="subject"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subject</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., Important School Announcement"
                                  {...field}
                                />
                              </FormControl>
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
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <div className="inline-block"> 
                            <Button type="submit" disabled={isSubmitting || (messageType === 'whatsapp' && !whatsAppConfigured)}>
                              {isSubmitting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="mr-2 h-4 w-4" />
                              )}
                              Send Message
                            </Button>
                           </div>
                        </TooltipTrigger>
                        {messageType === 'whatsapp' && !whatsAppConfigured && (
                           <TooltipContent>
                                <p>WhatsApp API credentials not configured in settings.</p>
                            </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <MessageHistory messages={messages} />
        </TabsContent>
      </Tabs>
    </>
  );
}
