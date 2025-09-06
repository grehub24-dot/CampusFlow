
'use client'

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useSchoolInfo } from '@/context/school-info-context';


import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
  schoolName: z.string().min(1, 'School name is required.'),
  logo: z.any().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function SchoolInfoSettings() {
  const { toast } = useToast();
  const { schoolInfo, loading, setSchoolInfo } = useSchoolInfo();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      schoolName: schoolInfo?.schoolName || "CampusFlow Academy",
    }
  });
  
  React.useEffect(() => {
    if (schoolInfo) {
      form.reset({ schoolName: schoolInfo.schoolName });
    }
  }, [schoolInfo, form]);


  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
        const settingsDocRef = doc(db, "settings", "school-info");
        // In a real app, you would handle file uploads to a service like Firebase Storage
        // and get back a URL to save in Firestore. For now, we only save the name.
        const newInfo = { 
            schoolName: values.schoolName,
            logoUrl: schoolInfo?.logoUrl || "https://picsum.photos/80/80", // Keep existing logo or default
        };
        await setDoc(settingsDocRef, newInfo, { merge: true });

        // Update context immediately for a responsive UI
        setSchoolInfo(newInfo);
        
        toast({
            title: "Settings Saved",
            description: "Your school information has been updated.",
        });
    } catch (error) {
        console.error("Error saving school info:", error);
        toast({ variant: "destructive", title: "Save Error", description: "Could not save your settings." });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>School Information</CardTitle>
        <CardDescription>Update your school's profile details and logo.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
             <div className="space-y-4">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-10 w-full" />
            </div>
        ) : (
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="schoolName"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>School Name</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <div className="space-y-2">
                        <FormLabel>School Logo</FormLabel>
                        <div className="flex items-center gap-4">
                          <Image src={schoolInfo?.logoUrl || "https://picsum.photos/80/80"} width={80} height={80} alt="School Logo" className="rounded-md" data-ai-hint="logo" />
                          <Input id="logo-upload" type="file" className="max-w-xs" disabled />
                        </div>
                        <p className="text-xs text-muted-foreground">Logo upload is not yet implemented.</p>
                    </div>
                    
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </form>
            </Form>
        )}
      </CardContent>
    </Card>
  )
}
