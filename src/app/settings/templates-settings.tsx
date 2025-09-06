
'use client'

import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CommunicationTemplate } from '@/types';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

const templateSchema = z.object({
  name: z.string().optional(), // Now includes subject for email
  content: z.string().min(10, "Template content is too short."),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

const SMS_TEMPLATE_DEFINITIONS = [
    { id: 'payment-reminder', name: 'Payment Reminder', placeholders: ['{{studentName}}', '{{balance}}', '{{dueDate}}'] },
    { id: 'payment-confirmation', name: 'Payment Confirmation', placeholders: ['{{studentName}}', '{{amountPaid}}', '{{newBalance}}'] },
    { id: 'welcome-message', name: 'Welcome Message', placeholders: ['{{studentName}}', '{{className}}', '{{schoolName}}', '{{feesDue}}'] },
    { id: 'absentee-notice', name: 'Absentee Notice', placeholders: ['{{studentName}}', '{{date}}'] },
];

const EMAIL_TEMPLATE_DEFINITIONS = [
    { id: 'payment-reminder', name: 'Payment Reminder', placeholders: ['{{studentName}}', '{{balance}}', '{{dueDate}}', '{{schoolName}}'] },
    { id: 'payment-confirmation', name: 'Payment Confirmation', placeholders: ['{{studentName}}', '{{amountPaid}}', '{{newBalance}}', '{{schoolName}}'] },
    { id: 'welcome-message', name: 'Welcome Message', placeholders: ['{{studentName}}', '{{className}}', '{{schoolName}}'] },
    { id: 'absentee-notice', name: 'Absentee Notice', placeholders: ['{{studentName}}', '{{date}}', '{{schoolName}}'] },
];

const DEFAULT_TEMPLATES: Record<'sms' | 'email', Record<string, { name: string, content: string }>> = {
    sms: {
        'payment-reminder': { name: 'Payment Reminder', content: 'Dear Guardian, a friendly reminder that the outstanding balance for {{studentName}} is GHS {{balance}}, due on {{dueDate}}. Thank you.' },
        'payment-confirmation': { name: 'Payment Confirmation', content: 'Dear Guardian, we have received a payment of GHS {{amountPaid}} for {{studentName}}. The new balance is GHS {{newBalance}}. Thank you.' },
        'welcome-message': { name: 'Welcome Message', content: 'Dear Guardian,\nWith great joy we welcome {{studentName}} into the {{schoolName}} {{className}} family. We cherish your trust in us and will nurture your child with love and patience. Kindly pay GHS {{feesDue}} to complete enrolment.' },
        'absentee-notice': { name: 'Absentee Notice', content: 'Dear Guardian, this is to inform you that {{studentName}} was absent from school today, {{date}}. Please contact the school office if you have any concerns.' },
    },
    email: {
        'payment-reminder': { name: 'Payment Reminder', content: 'Dear Guardian,\n\nThis is a friendly reminder that there is an outstanding balance of GHS {{balance}} for {{studentName}}. Payment is due on {{dueDate}}.\n\nPlease make a payment at your earliest convenience.\n\nThank you,\n{{schoolName}}' },
        'payment-confirmation': { name: 'Payment Confirmation', content: 'Dear Guardian,\n\nWe have received a payment of GHS {{amountPaid}} for {{studentName}}.\n\nThe new balance on the account is GHS {{newBalance}}.\n\nThank you for your prompt payment.\n\nSincerely,\n{{schoolName}}' },
        'welcome-message': { name: 'Welcome Message', content: 'Dear {{studentName}} and Family,\n\nWelcome to {{schoolName}}! We are so excited to have you join our community and begin your journey in {{className}}.\n\nWe look forward to a successful and enriching academic year together.\n\nWarmly,\nThe team at {{schoolName}}' },
        'absentee-notice': { name: 'Absentee Notice', content: 'Dear Guardian,\n\nThis email is to inform you that {{studentName}} was marked absent from school on {{date}}.\n\nIf you have any questions or this was in error, please contact the school office.\n\nSincerely,\n{{schoolName}}' },
    }
}

function TemplateForm({ template, onSave, isSubmitting, type }: { template: CommunicationTemplate, onSave: (data: TemplateFormValues) => void, isSubmitting: boolean, type: 'sms' | 'email' }) {
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template.name || '',
      content: template.content || '',
    }
  });
  
  React.useEffect(() => {
    form.reset({
        name: template.name,
        content: template.content,
    })
  }, [template, form]);

  const onSubmit: SubmitHandler<TemplateFormValues> = (values) => {
    onSave(values);
  };
  
  const placeholders = type === 'sms' ? SMS_TEMPLATE_DEFINITIONS.find(t => t.id === template.id)?.placeholders || [] : EMAIL_TEMPLATE_DEFINITIONS.find(t => t.id === template.id)?.placeholders || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {type === 'email' && (
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Email Subject / Template Name</FormLabel>
                    <FormControl>
                        <Input placeholder="Enter the subject for the email" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        )}
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter your template message here..."
                  className="min-h-[120px] resize-y"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {placeholders.length > 0 && (
            <div>
                <p className="text-sm text-muted-foreground mb-2">Click to copy a placeholder:</p>
                <div className="flex flex-wrap gap-2">
                    {placeholders.map(p => (
                        <Badge 
                            key={p} 
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => navigator.clipboard.writeText(p)}
                        >
                            {p}
                        </Badge>
                    ))}
                </div>
            </div>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Template
          </Button>
        </div>
      </form>
    </Form>
  )
}

export function TemplatesSettings() {
    const [smsTemplates, setSmsTemplates] = useState<Record<string, CommunicationTemplate>>({});
    const [emailTemplates, setEmailTemplates] = useState<Record<string, CommunicationTemplate>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});
    const { toast } = useToast();

    useEffect(() => {
        const smsTemplatesRef = collection(db, "settings", "templates", "sms");
        const unsubscribeSms = onSnapshot(smsTemplatesRef, (snapshot) => {
            const fetchedTemplates: Record<string, CommunicationTemplate> = {};
            snapshot.forEach((doc) => {
                fetchedTemplates[doc.id] = { id: doc.id, ...doc.data() } as CommunicationTemplate;
            });
            SMS_TEMPLATE_DEFINITIONS.forEach(def => {
                if (!fetchedTemplates[def.id]) {
                    fetchedTemplates[def.id] = { ...DEFAULT_TEMPLATES.sms[def.id], id: def.id, type: 'SMS' };
                }
            });
            setSmsTemplates(fetchedTemplates);
            if (Object.keys(emailTemplates).length > 0) setIsLoading(false);
        });
        
        const emailTemplatesRef = collection(db, "settings", "templates", "email");
        const unsubscribeEmail = onSnapshot(emailTemplatesRef, (snapshot) => {
            const fetchedTemplates: Record<string, CommunicationTemplate> = {};
            snapshot.forEach((doc) => {
                fetchedTemplates[doc.id] = { id: doc.id, ...doc.data() } as CommunicationTemplate;
            });
             EMAIL_TEMPLATE_DEFINITIONS.forEach(def => {
                if (!fetchedTemplates[def.id]) {
                    fetchedTemplates[def.id] = { ...DEFAULT_TEMPLATES.email[def.id], id: def.id, type: 'Email' };
                }
            });
            setEmailTemplates(fetchedTemplates);
            if (Object.keys(smsTemplates).length > 0) setIsLoading(false);
        });

        // Fallback for loading state
        const timer = setTimeout(() => setIsLoading(false), 3000);

        return () => {
            clearTimeout(timer);
            unsubscribeSms();
            unsubscribeEmail();
        };
    }, []);

    const handleSave = async (templateId: string, type: 'sms' | 'email', values: TemplateFormValues) => {
        setIsSubmitting(prev => ({...prev, [`${type}-${templateId}`]: true}));
        try {
            const templateRef = doc(db, "settings", "templates", type, templateId);
            const templateDefinition = type === 'sms' ? SMS_TEMPLATE_DEFINITIONS.find(t => t.id === templateId) : EMAIL_TEMPLATE_DEFINITIONS.find(t => t.id === templateId);
            
            const dataToSave = {
                id: templateId,
                name: values.name || templateDefinition?.name || 'Custom Template',
                content: values.content,
                type: type.toUpperCase() as 'SMS' | 'Email'
            };

            await setDoc(templateRef, dataToSave, { merge: true });

            toast({
                title: 'Template Saved',
                description: 'Your communication template has been successfully updated.',
            });
        } catch (error) {
            console.error("Error saving template:", error);
            toast({
                variant: "destructive",
                title: "Save Error",
                description: "Could not save the template. Please try again.",
            });
        } finally {
            setIsSubmitting(prev => ({...prev, [`${type}-${templateId}`]: false}));
        }
    };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Communication Templates</CardTitle>
        <CardDescription>
          Customize the content for automated messages sent from the system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sms">
            <TabsList>
                <TabsTrigger value="sms">SMS Templates</TabsTrigger>
                <TabsTrigger value="email">Email Templates</TabsTrigger>
            </TabsList>
            <TabsContent value="sms" className="pt-4">
                 {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : (
                    <Accordion type="single" collapsible className="w-full">
                        {Object.values(smsTemplates).map(template => (
                            <AccordionItem value={template.id} key={template.id}>
                                <AccordionTrigger>{template.name}</AccordionTrigger>
                                <AccordionContent>
                                <TemplateForm 
                                    template={template} 
                                    onSave={(data) => handleSave(template.id, 'sms', data)}
                                    isSubmitting={isSubmitting[`sms-${template.id}`] || false}
                                    type="sms"
                                />
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </TabsContent>
             <TabsContent value="email" className="pt-4">
                 {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : (
                    <Accordion type="single" collapsible className="w-full">
                        {Object.values(emailTemplates).map(template => (
                            <AccordionItem value={template.id} key={template.id}>
                                <AccordionTrigger>{template.name}</AccordionTrigger>
                                <AccordionContent>
                                <TemplateForm 
                                    template={template} 
                                    onSave={(data) => handleSave(template.id, 'email', data)}
                                    isSubmitting={isSubmitting[`email-${template.id}`] || false}
                                    type="email"
                                />
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

