

'use client'

import React from 'react';
import { collection, onSnapshot } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { User } from '@/types';
import { useToast } from '@/hooks/use-toast';

import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { UserTable } from "./user-table";
import { userColumns } from "./user-columns";
import { AcademicSettings } from './academic-settings';
import { ClassSettings } from './class-settings';
import { FeeStructureSettings } from './fee-structure-settings';

export default function SettingsPage() {
  const [users, setUsers] = React.useState<User[]>([]);
  const { toast } = useToast();

  React.useEffect(() => {
    // Note: Assuming a 'users' collection exists.
    // You will need to create this and add data for users to appear.
    const usersQuery = collection(db, "users");
    const unsubscribeUsers = onSnapshot(usersQuery, (querySnapshot) => {
      const usersData: User[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() } as User);
      });
      setUsers(usersData);
    }, (error) => {
      console.error("Error fetching users:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch users." });
    });

    return () => unsubscribeUsers();
  }, [toast]);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your school's information, user accounts, and system settings."
      />
      <Tabs defaultValue="school-info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="school-info">School Info</TabsTrigger>
          <TabsTrigger value="academic-year">Academic Year</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="fees">Fee Structure</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="billing">Billing & Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="school-info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>Update your school's profile details and logo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="school-name">School Name</Label>
                <Input id="school-name" defaultValue="CampusFlow Academy" />
              </div>
              <div className="space-y-2">
                <Label>School Logo</Label>
                <div className="flex items-center gap-4">
                  <Image src="https://picsum.photos/80/80" width={80} height={80} alt="School Logo" className="rounded-md" data-ai-hint="logo" />
                  <Input id="logo-upload" type="file" className="max-w-xs" />
                </div>
                <p className="text-xs text-muted-foreground">Upload a JPG, PNG, or SVG. Max size 2MB.</p>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="academic-year">
          <AcademicSettings />
        </TabsContent>

        <TabsContent value="classes">
            <ClassSettings />
        </TabsContent>

        <TabsContent value="fees">
            <FeeStructureSettings />
        </TabsContent>
        
        <TabsContent value="users">
            <UserTable columns={userColumns} data={users} />
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Communication Templates</CardTitle>
              <CardDescription>Customize email and SMS templates.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Template customization is coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Invoices</CardTitle>
              <CardDescription>Manage your subscription and invoice settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Invoice and receipt customization is coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
