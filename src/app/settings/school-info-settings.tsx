
'use client'

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

const formSchema = z.object({
  schoolName: z.string().min(1, 'School name is required.'),
  logo: z.any().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function SchoolInfoSettings() {
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      schoolName: "CampusFlow Academy",
    }
  });

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    // In a real app, you would handle file upload and save the settings to a database.
    console.log(values);
    toast({
      title: "Settings Saved",
      description: "Your school information has been updated.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>School Information</CardTitle>
        <CardDescription>Update your school's profile details and logo.</CardDescription>
      </CardHeader>
      <CardContent>
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
                      <Image src="https://picsum.photos/80/80" width={80} height={80} alt="School Logo" className="rounded-md" data-ai-hint="logo" />
                      <Input id="logo-upload" type="file" className="max-w-xs" />
                    </div>
                    <p className="text-xs text-muted-foreground">Upload a JPG, PNG, or SVG. Max size 2MB.</p>
                </div>
                
                <Button type="submit">Save Changes</Button>
            </form>
        </Form>
      </CardContent>
    </Card>
  )
}
