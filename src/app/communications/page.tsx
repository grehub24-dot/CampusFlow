

'use client'

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Student, SchoolClass, Message, Invoice as InvoiceType, MomoProvider, CommunicationTemplate, Bundle } from '@/types';
import { sendSms } from '@/lib/frog-api';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Wallet, ShoppingCart, ArrowLeft, Smartphone, CreditCard } from 'lucide-react';
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ToastAction } from '@/components/ui/toast';
import Image from 'next/image';

const messageFormSchema = z.object({
  recipientType: z.enum(['all', 'class', 'single', 'manual']),
  classId: z.string().optional(),
  studentId: z.string().optional(),
  manualPhone: z.string().optional(),
  messageType: z.enum(['sms', 'email']),
  templateId: z.string().optional(),
  subject: z.string().optional(), // For email
  message: z.string().min(10, 'Message must be at least 10 characters.'),
}).refine(data => {
    if (data.recipientType === 'manual' && data.messageType === 'sms') {
        return !!data.manualPhone && data.manualPhone.length > 0;
    }
    if (data.recipientType === 'manual' && data.messageType === 'email') {
        return !!data.manualPhone && data.manualPhone.includes('@');
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

const communicationBundles: Bundle[] = [
    { name: 'Basic Bundle', msgCount: 175, price: 5, validity: 30 },
    { name: 'Standard Bundle', msgCount: 350, price: 10, validity: 30 },
    { name: 'Pro Bundle', msgCount: 700, price: 20, validity: 30 },
    { name: 'Business Bundle', msgCount: 1750, price: 50, validity: 30 },
];

const MOMO_PROVIDERS = [
  { code: "MTN",   name: "MTN Mobile Money" },
  { code: "VOD",   name: "Vodafone Cash" },
  { code: "TIGO",  name: "AirtelTigo Money" },
] as const;


function PurchaseCard({ bundle, onPurchase }: { bundle: Bundle; onPurchase: (bundle: Bundle) => void; }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl">{bundle.name}</CardTitle>
        <CardDescription>{bundle.msgCount} SMS credits</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-3xl font-bold text-primary">GHS {bundle.price}</p>
        <p className="text-sm text-muted-foreground">Valid for {bundle.validity} days</p>
      </CardContent>
      <div className="p-4 pt-0">
        <Button className="w-full" onClick={() => onPurchase(bundle)}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Buy Credit
        </Button>
      </div>
    </Card>
  );
}

function CheckoutModal({
  open,
  bundle,
  onClose,
  onSuccess,
}: {
  open: boolean;
  bundle: Bundle | null;
  onClose: () => void;
  onSuccess: (bundleSize: number) => void;
}) {
  const [provider, setProvider] = useState<MomoProvider['code']>("MTN");
  const [mobileNumber, setMobileNumber] = useState('0536282694');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceType | null>(null);

  const { toast } = useToast();
  
  useEffect(() => {
    if (bundle && open) {
        handleCreateInvoice();
    } else {
        setInvoice(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle, open]);

  useEffect(() => {
    if (!invoice || !open) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/invoice-status?id=${invoice.id}`);
        if (!res.ok) return;
        const json = await res.json();

        if (json.status === "PAID") {
            toast({ title: "Payment received ✅", description: "Your bundle is now active." });
            if (bundle?.msgCount) {
              onSuccess(bundle.msgCount);
            }
            onClose();
            clearInterval(intervalId);
        }
        if (json.status === "FAILED" || json.status === "EXPIRED") {
            toast({ variant: "destructive", title: "Payment failed" });
            onClose();
            clearInterval(intervalId);
        }
      } catch (e) {
        // Silently ignore polling errors
      }
    }, 3000);
    return () => clearInterval(intervalId);
  }, [invoice, open, bundle, onSuccess, onClose, toast]);


  async function handleCreateInvoice() {
    if (!bundle) return;
    setLoading(true);
    try {
      const res = await fetch("/api/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: bundle.price,
          description: `${bundle.name} (${bundle.msgCount} SMS)`,
          reference: `sms-${bundle.msgCount}-${Date.now()}`,
        }),
      });

      if (!res.ok) throw new Error("Invoice creation failed");
      const inv: InvoiceType = await res.json();
      setInvoice(inv);

    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  async function handlePay() {
    if (!invoice) return;
    setLoading(true);
    try {
       await fetch("/api/send-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: invoice.id, provider }),
      });
      toast({ title: "Prompt sent", description: "Check your phone and approve the payment." });
    } catch {
       toast({ variant: "destructive", title: "Could not send prompt" });
    } finally {
      setLoading(false);
    }
  }

  if (!bundle) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl p-0" onInteractOutside={(e) => e.preventDefault()}>
         <DialogHeader className="sr-only">
          <DialogTitle>Complete Your Purchase</DialogTitle>
          <DialogDescription>
            Enter your payment details to buy SMS credits.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-[1fr,400px]">
          {/* Left side: Form */}
          <div className="p-8">
            <button onClick={onClose} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="mt-6">
              <h3 className="text-lg font-semibold">Pay With:</h3>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button variant="outline" className="border-primary text-primary border-2">
                  <Smartphone className="mr-2" /> Mobile Money
                </Button>
                <Button variant="outline" disabled>
                  <CreditCard className="mr-2" /> Credit Card(3DS)
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Make Invoice payment Via MTN MoMo, Vodafone Cash or Airtel/Tigo Money</p>
            </div>
            
            <div className="mt-6 space-y-4">
               <div>
                  <Label>Provider</Label>
                  <Select value={provider} onValueChange={(v) => setProvider(v as MomoProvider['code'])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOMO_PROVIDERS.map((p) => (
                        <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
               </div>
               <div>
                  <Label>Mobile Number</Label>
                  <Input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} />
               </div>
                <div>
                  <Label>Email (Optional)</Label>
                  <Input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
               </div>
            </div>
            
            <Button className="w-full mt-8 bg-red-600 hover:bg-red-700 text-white" size="lg" onClick={handlePay} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'PAY NOW'}
            </Button>
            <div className="text-center mt-4 text-xs text-muted-foreground">
                Powered by <span className="font-bold">redde</span> | Privacy | Terms
            </div>
          </div>
          
          {/* Right side: Invoice Details */}
          <div className="bg-[#EBF3FF] p-8 space-y-6">
             <Image src="https://picsum.photos/100/40" width={100} height={40} alt="Frog Logo" data-ai-hint="logo" />
            
             <Card>
                <CardHeader>
                  <CardTitle>Invoice Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                   <div className="flex justify-between">
                     <span>Amount:</span>
                     <span className="font-medium">GHS {bundle.price}</span>
                   </div>
                   <div className="flex justify-between">
                     <span>Description:</span>
                     <span className="font-medium text-right flex items-center gap-1">
                        <Image src="https://picsum.photos/16/16" width={16} height={16} alt="frog icon" data-ai-hint="logo" />
                         Frog Invoice Payment
                     </span>
                   </div>
                   <hr/>
                   <div className="flex justify-between font-bold text-base">
                     <span>Total:</span>
                     <span>GHS {bundle.price}</span>
                   </div>
                </CardContent>
             </Card>

             <div className="bg-blue-900 text-white rounded-lg p-6 text-center space-y-2">
                <p className="text-lg font-semibold">redde</p>
                <p className="text-3xl font-bold tracking-wider">{mobileNumber}</p>
                <p className="text-sm">Provider: {provider}</p>
             </div>
             
             <div className="flex justify-center">
                <Image src="https://picsum.photos/80/30" width={80} height={30} alt="PCI DSS" data-ai-hint="logo" />
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


export default function CommunicationsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<Record<string, CommunicationTemplate>>({});
  const [emailTemplates, setEmailTemplates] = useState<Record<string, CommunicationTemplate>>({});
  const [balance, setBalance] = useState<number>(50); // Start with a base of 50
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('send-message');
  const [selectedBundle, setSelectedBundle] = useState<Bundle | null>(null);

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

    return () => {
      unsubscribeStudents();
      unsubscribeClasses();
      unsubscribeMessages();
      unsubscribeSmsTemplates();
      unsubscribeEmailTemplates();
    };
  }, []);

  const onSubmit: SubmitHandler<MessageFormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      let recipients: string[] = [];
      if (values.messageType === 'sms') {
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
              action: <ToastAction altText="Buy Credit" onClick={() => setActiveTab('purchase')}>Buy Credit</ToastAction>,
            });
            setIsSubmitting(false);
            return;
        }

        await sendSms(uniqueRecipients, values.message);
        setBalance(prevBalance => prevBalance - uniqueRecipients.length);
        toast({
          title: 'Messages Sent',
          description: `SMS dispatched to ${uniqueRecipients.length} recipients.`,
        });
      } else {
         toast({
          title: 'Email Sent (Simulated)',
          description: `Email dispatched to ${uniqueRecipients.length} recipients. This is a simulation as the email API is not connected.`,
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
  
  const handlePurchaseSuccess = (bundleSize: number) => {
    setBalance(prevBalance => prevBalance + bundleSize);
  }

  const currentTemplates = messageType === 'sms' ? smsTemplates : emailTemplates;


  return (
    <>
      <PageHeader
        title="Communications"
        description="Send SMS and email notifications to students and guardians."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
         <StatCard 
            title="SMS Credit Balance"
            value={balance.toLocaleString()}
            icon={Wallet}
            color="text-green-500"
            description="Remaining SMS units"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="send-message">Send Message</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="purchase">Purchase Bundles</TabsTrigger>
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
                              <FormLabel>{messageType === 'sms' ? 'Phone Number' : 'Email Address'}</FormLabel>
                              <FormControl>
                                <Input placeholder={messageType === 'sms' ? 'Enter phone number' : 'Enter email address'} {...field} />
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
                                <SelectItem value="sms">SMS</SelectItem>
                                <SelectItem value="email">
                                  Email
                                </SelectItem>
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
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Send Message
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <MessageHistory messages={messages} />
        </TabsContent>

        <TabsContent value="purchase">
          <Card>
            <CardHeader>
              <CardTitle>Purchase SMS / Email Bundles</CardTitle>
              <CardDescription>Top-up credits instantly via Mobile Money.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {communicationBundles.map((b) => (
                <PurchaseCard key={b.name} bundle={b} onPurchase={setSelectedBundle} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <CheckoutModal
        open={!!selectedBundle}
        bundle={selectedBundle}
        onClose={() => setSelectedBundle(null)}
        onSuccess={handlePurchaseSuccess}
      />
    </>
  );
}
 