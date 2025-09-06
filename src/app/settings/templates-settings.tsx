
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

const templateSchema = z.object({
  content: z.string().min(10, "Template content is too short."),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

const TEMPLATE_DEFINITIONS = [
    { id: 'payment-reminder', name: 'Payment Reminder SMS', placeholders: ['{{studentName}}', '{{balance}}', '{{dueDate}}'] },
    { id: 'payment-confirmation', name: 'Payment Confirmation SMS', placeholders: ['{{studentName}}', '{{amountPaid}}', '{{newBalance}}'] },
    { id: 'welcome-message', name: 'Welcome Message SMS', placeholders: ['{{studentName}}', '{{className}}', '{{schoolName}}'] },
    { id: 'absentee-notice', name: 'Absentee Notice SMS', placeholders: ['{{studentName}}', '{{date}}'] },
];

const DEFAULT_TEMPLATES: Record<string, string> = {
    'payment-reminder': 'Dear Guardian, a friendly reminder that the outstanding balance for {{studentName}} is GHS {{balance}}, due on {{dueDate}}. Thank you.',
    'payment-confirmation': 'Dear Guardian, we have received a payment of GHS {{amountPaid}} for {{studentName}}. The new balance is GHS {{newBalance}}. Thank you.',
    'welcome-message': 'Welcome to {{schoolName}}, {{studentName}}! We are excited to have you in {{className}}. We look forward to a successful academic year.',
    'absentee-notice': 'Dear Guardian, this is to inform you that {{studentName}} was absent from school today, {{date}}. Please contact the school office if you have any concerns.',
}

function TemplateForm({ template, onSave, isSubmitting }: { template: CommunicationTemplate, onSave: (data: TemplateFormValues) => void, isSubmitting: boolean }) {
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      content: template.content || '',
    }
  });

  const onSubmit: SubmitHandler<TemplateFormValues> = (values) => {
    onSave(values);
  };
  
  const placeholders = TEMPLATE_DEFINITIONS.find(t => t.id === template.id)?.placeholders || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
    const [templates, setTemplates] = useState<Record<string, CommunicationTemplate>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});
    const { toast } = useToast();

    useEffect(() => {
        const templatesRef = collection(db, "settings", "templates", "sms");
        const unsubscribe = onSnapshot(templatesRef, (snapshot) => {
            const fetchedTemplates: Record<string, CommunicationTemplate> = {};
            snapshot.forEach((doc) => {
                fetchedTemplates[doc.id] = { id: doc.id, ...doc.data() } as CommunicationTemplate;
            });

            // Ensure all default templates exist
            TEMPLATE_DEFINITIONS.forEach(def => {
                if (!fetchedTemplates[def.id]) {
                    fetchedTemplates[def.id] = {
                        id: def.id,
                        name: def.name,
                        content: DEFAULT_TEMPLATES[def.id],
                        type: 'SMS'
                    }
                }
            })
            setTemplates(fetchedTemplates);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching templates:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch communication templates." });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);

    const handleSave = async (templateId: string, values: TemplateFormValues) => {
        setIsSubmitting(prev => ({...prev, [templateId]: true}));
        try {
            const templateRef = doc(db, "settings", "templates", "sms", templateId);
            const templateDefinition = TEMPLATE_DEFINITIONS.find(t => t.id === templateId);
            await setDoc(templateRef, {
                id: templateId,
                name: templateDefinition?.name || 'Custom Template',
                content: values.content,
                type: 'SMS'
            }, { merge: true });

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
            setIsSubmitting(prev => ({...prev, [templateId]: false}));
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
                <TabsTrigger value="email" disabled>Email Templates (Coming Soon)</TabsTrigger>
            </TabsList>
            <TabsContent value="sms" className="pt-4">
                 {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : (
                    <Accordion type="single" collapsible className="w-full">
                        {Object.values(templates).map(template => (
                            <AccordionItem value={template.id} key={template.id}>
                                <AccordionTrigger>{template.name}</AccordionTrigger>
                                <AccordionContent>
                                <TemplateForm 
                                    template={template} 
                                    onSave={(data) => handleSave(template.id, data)}
                                    isSubmitting={isSubmitting[template.id] || false}
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

    