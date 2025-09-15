
'use client'

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useSchoolInfo } from '@/context/school-info-context';
import { useAuth } from '@/context/auth-context';
import { logActivity } from '@/lib/activity-logger';


import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  schoolName: z.string().min(1, 'School name is required.'),
  logo: z.any().optional(),
  address: z.string().optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function SchoolInfoSettings() {
  const { toast } = useToast();
  const { schoolInfo, loading, setSchoolInfo } = useSchoolInfo();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      schoolName: schoolInfo?.schoolName || "CampusFlow Academy",
      address: schoolInfo?.address || "",
      location: schoolInfo?.location || "",
      phone: schoolInfo?.phone || "",
    }
  });
  
  React.useEffect(() => {
    if (schoolInfo) {
      form.reset({ 
          schoolName: schoolInfo.schoolName || 'CampusFlow Academy',
          address: schoolInfo.address || '',
          location: schoolInfo.location || '',
          phone: schoolInfo.phone || '',
      });
      setLogoPreview(schoolInfo.logoUrl || null);
    }
  }, [schoolInfo, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }


  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
        const settingsDocRef = doc(db, "settings", "school-info");
        
        const newInfo = { 
            schoolName: values.schoolName,
            logoUrl: logoPreview || schoolInfo?.logoUrl || "/logo.jpg",
            address: values.address,
            location: values.location,
            phone: values.phone,
        };
        await setDoc(settingsDocRef, newInfo, { merge: true });

        // Update context immediately for a responsive UI
        setSchoolInfo({ ...schoolInfo, ...newInfo } as any);
        
        await logActivity(user, 'School Info Updated', `Updated school information. New name: ${values.schoolName}`);
        
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

                    <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                                <Textarea placeholder="P.O. Box 123, City, Country" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Old Tafo, Kumasi" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />

                     <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                                <Input placeholder="+233 12 345 6789" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <FormItem>
                        <FormLabel>School Logo</FormLabel>
                        <div className="flex items-center gap-4">
                            <Image 
                                src={logoPreview || "/logo.jpg"} 
                                width={80} 
                                height={80} 
                                alt="School Logo" 
                                className="rounded-md" 
                                data-ai-hint="logo" 
                            />
                           <FormControl>
                                <Input type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={handleFileChange} className="max-w-xs" />
                           </FormControl>
                        </div>
                        <FormDescription>Upload a JPG, PNG, or SVG. Max size 2MB.</FormDescription>
                    </FormItem>
                    
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Changes
                      </Button>
                    </div>
                </form>
            </Form>
        )}
      </CardContent>
    </Card>
  )
}
