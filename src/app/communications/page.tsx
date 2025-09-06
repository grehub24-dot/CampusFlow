
'use client'

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Student, SchoolClass, Message, Invoice as InvoiceType, MomoProvider, CommunicationTemplate } from '@/types';
import { getBalance, sendSms } from '@/lib/frog-api';
import { differenceInDays, format } from 'date-fns';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Wallet, ShoppingCart, CalendarDays, Hourglass } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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
    if (data.recipientType === 'manual') {
        return !!data.manualPhone && data.manualPhone.length > 0;
    }
    return true;
}, {
    message: 'Phone number is required for manual entry.',
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

// This represents the original data for bundles available for purchase.
const baseCommunicationBundles = [
    {
        msgCount: 175,
        price: 5,
        validity: 30,
        link: "https://example.com/purchase/5"
    },
    {
        msgCount: 350,
        price: 10,
        validity: 30,
        link: "https://example.com/purchase/10"
    },
    {
        msgCount: 700,
        price: 20,
        validity: 30,
        link: "https://example.com/purchase/20"
    },
    {
        msgCount: 1750,
        price: 50,
        validity: 30,
        link: "https://example.com/purchase/50"
    }
];

// This represents a dynamic active bundle, as if fetched from an API.
const activeBundleFromApi = {
    msgCount: 175,
    price: 5, // The original price from the API
    validityDays: 30,
    expiryDate: new Date('2025-10-05'),
};

const MOMO_PROVIDERS = [
  { code: "MTN",   name: "MTN Mobile Money",   dial: "*170#" },
  { code: "VOD",   name: "Vodafone Cash",      dial: "*110#" },
  { code: "TIGO",  name: "AirtelTigo Money",   dial: "*500#" },
] as const;

function BundleCard({
  bundle,
  setInvoice
}: {
  bundle: typeof baseCommunicationBundles[0];
  setInvoice: (invoice: InvoiceType) => void;
}) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const multipliedPrice = bundle.price * 4;
  const title = `${bundle.msgCount}msg @ ${multipliedPrice}GHS for ${bundle.validity}days`;

  async function createInvoice() {
    setLoading(true);
    try {
      const res = await fetch("/api/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: multipliedPrice,
          description: title,
          reference: `sms-${bundle.msgCount}-${Date.now()}`, // unique
        }),
      });

      if (!res.ok) throw new Error("Invoice creation failed");

      const inv: InvoiceType = await res.json();
      setInvoice(inv);          // opens the modal
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-2xl font-bold text-primary">GHS {multipliedPrice}</p>
        <p className="text-sm text-muted-foreground">Valid for {bundle.validity} day(s)</p>
      </CardContent>
      <div className="p-4 pt-0">
        <Button className="w-full" onClick={createInvoice} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
          Buy Now
        </Button>
      </div>
    </Card>
  );
}

function CheckoutModal({
  open,
  invoice,
  onClose,
  onSuccess,
}: {
  open: boolean;
  invoice: InvoiceType | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [provider, setProvider] = useState<MomoProvider>("MTN");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  /* Polling logic ----------------------------------------------------*/
  useEffect(() => {
    if (!invoice) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/invoice-status?id=${invoice.id}`);
        if (!res.ok) return; // Don't show an error for a failed poll, just try again
        const json = await res.json();

        if (json.status === "PAID") {
            toast({ title: "Payment received ✅", description: "Your bundle is now active." });
            onSuccess();
            onClose();
        }
        if (json.status === "FAILED" || json.status === "EXPIRED") {
            toast({ variant: "destructive", title: "Payment failed" });
            onClose();
        }
      } catch (e) {
        // Silently ignore polling errors
      }
    }, 3000);
    return () => clearInterval(id);
  }, [invoice, onClose, onSuccess, toast]);

  async function requestPrompt() {
    setSubmitting(true);
    try {
      await fetch("/api/send-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: invoice!.id, provider }),
      });
      toast({ title: "Prompt sent", description: "Check your phone and approve the payment." });
    } catch {
      toast({ variant: "destructive", title: "Could not send prompt" });
    } finally {
      setSubmitting(false);
    }
  }

  if (!invoice) return null;

  const selectedDial = MOMO_PROVIDERS.find((p) => p.code === provider)?.dial;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Complete purchase</DialogTitle>
          <DialogDescription>
            {invoice.description} · <span className="font-semibold">GHS {invoice.amount}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <Label>Choose wallet</Label>
          <RadioGroup value={provider} onValueChange={(v) => setProvider(v as MomoProvider)}>
            {MOMO_PROVIDERS.map((p) => (
              <div key={p.code} className="flex items-center space-x-2">
                <RadioGroupItem value={p.code} id={p.code} />
                <Label htmlFor={p.code}>{p.name}</Label>
              </div>
            ))}
          </RadioGroup>

          <div className="rounded bg-muted p-3 text-sm">
            Dial <span className="font-mono font-bold">{invoice.dialCode || selectedDial}</span> to receive prompt
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={requestPrompt} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Request prompt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function CommunicationsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<Record<string, CommunicationTemplate>>({});
  const [balance, setBalance] = useState<number | null>(null);
  const [invoice, setInvoice] = useState<InvoiceType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (templateId && templates[templateId]) {
      form.setValue('message', templates[templateId].content);
    }
  }, [templateId, templates, form]);

  const fetchBalance = async () => {
      try {
        const result = await getBalance();
        if (result.success) {
          setBalance(result.balance);
        } else {
          // Don't show an error toast if the API is simply not configured.
          if (result.error !== 'API credentials not configured.') {
              console.error("API Error fetching balance:", result.error);
              toast({
                variant: 'destructive',
                title: 'API Error',
                description: 'Could not fetch SMS credit balance.'
              });
          }
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
    
  const refetchBalance = async () => {
    const r = await getBalance();
    if (r.success) setBalance(r.balance);
  };

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
    
    const templatesRef = collection(db, "settings", "templates", "sms");
    const unsubscribeTemplates = onSnapshot(templatesRef, (snapshot) => {
        const fetchedTemplates: Record<string, CommunicationTemplate> = {};
        snapshot.forEach((doc) => {
            fetchedTemplates[doc.id] = { id: doc.id, ...doc.data() } as CommunicationTemplate;
        });
        setTemplates(fetchedTemplates);
    });

    fetchBalance();

    return () => {
      unsubscribeStudents();
      unsubscribeClasses();
      unsubscribeMessages();
      unsubscribeTemplates();
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
      } else if (values.recipientType === 'manual' && values.manualPhone) {
        recipients.push(values.manualPhone);
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
  
  const displayedPrice = activeBundleFromApi.price * 4;
  const activeBundleDescription = `${activeBundleFromApi.msgCount}msg @ ${displayedPrice}GHS for ${activeBundleFromApi.validityDays}days`;
  const expiryDate = activeBundleFromApi.expiryDate;
  const daysLeft = differenceInDays(expiryDate, new Date());


  return (
    <>
      <PageHeader
        title="Communications"
        description="Send SMS and email notifications to students and guardians."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
         <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Your Active Bundles</CardTitle>
                <CardDescription>{activeBundleDescription}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-primary">
                    {balance !== null ? (balance / 2).toLocaleString() : <Loader2 className="h-6 w-6 animate-spin" />}
                </div>
                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                    <div className="flex items-center gap-1">
                       <CalendarDays className="h-3 w-3" />
                       <span>Expiring On: {format(expiryDate, 'PPP')}</span>
                    </div>
                     <div className="flex items-center gap-1">
                        <Hourglass className="h-3 w-3" />
                        <span>{daysLeft} days left</span>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="send-message">
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
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter phone number" {...field} />
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
                              onValueChange={field.onChange}
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
                                  Email (Not implemented)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      {messageType === 'sms' && (
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
                                  {Object.values(templates).map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                      {t.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      )}
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
              {baseCommunicationBundles.map((b) => (
                <BundleCard key={b.msgCount} bundle={b} setInvoice={setInvoice} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <CheckoutModal
        open={!!invoice}
        invoice={invoice}
        onClose={() => setInvoice(null)}
        onSuccess={refetchBalance}
      />
    </>
  );
}

    