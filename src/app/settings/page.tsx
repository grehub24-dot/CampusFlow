

'use client'

import React from 'react';
import { collection, onSnapshot } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { User } from '@/types';
import { useToast } from '@/hooks/use-toast';

import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserTable } from "./user-table";
import { userColumns } from "./user-columns";
import { AcademicSettings } from './academic-settings';
import { ClassSettings } from './class-settings';
import { FeeStructureSettings } from './fee-structure-settings';
import { IntegrationsSettings } from './integrations-settings';
import { FeeItemsSettings } from './fee-items-settings';
import { AdmissionSettings } from './admission-settings';
import { SchoolInfoSettings } from './school-info-settings';
import { TemplatesSettings } from './templates-settings';

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
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="school-info">School Info</TabsTrigger>
          <TabsTrigger value="academic-year">Academic Year</TabsTrigger>
          <TabsTrigger value="admission-ids">Admission IDs</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="fee-items">Fee Items</TabsTrigger>
          <TabsTrigger value="fee-structure">Fee Structure</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="billing">Billing & Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="school-info" className="space-y-4">
          <SchoolInfoSettings />
        </TabsContent>
        
        <TabsContent value="academic-year">
          <AcademicSettings />
        </TabsContent>
        
        <TabsContent value="admission-ids">
            <AdmissionSettings />
        </TabsContent>

        <TabsContent value="classes">
            <ClassSettings />
        </TabsContent>

        <TabsContent value="fee-items">
            <FeeItemsSettings />
        </TabsContent>
        
        <TabsContent value="fee-structure">
            <FeeStructureSettings />
        </TabsContent>

        <TabsContent value="users">
            <UserTable columns={userColumns} data={users} />
        </TabsContent>

        <TabsContent value="integrations">
            <IntegrationsSettings />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesSettings />
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
