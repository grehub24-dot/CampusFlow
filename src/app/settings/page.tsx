

'use client'

import React from 'react';
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from '@/lib/firebase';
import type { User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useSchoolInfo } from '@/context/school-info-context';
import { useAuth } from '@/context/auth-context';

import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagementSettings } from "./user-management-settings";
import { AcademicSettings } from './academic-settings';
import { ClassSettings } from './class-settings';
import { FeeStructureSettings } from './fee-structure-settings';
import { IntegrationsSettings } from './integrations-settings';
import { FeeItemsSettings } from './fee-items-settings';
import { SchoolInfoSettings } from './school-info-settings';
import { TemplatesSettings } from './templates-settings';
import { BillingSettings } from './billing-settings';

export default function SettingsPage() {
  const [users, setUsers] = React.useState<User[]>([]);
  const { toast } = useToast();
  const { schoolInfo } = useSchoolInfo();
  const { user } = useAuth();
  
  const canViewUsers = user?.role === 'Admin';


  React.useEffect(() => {
    if (!canViewUsers) {
      setUsers([]);
      return;
    }
    const usersQuery = query(collection(db, "users"));
    const unsubscribeUsers = onSnapshot(usersQuery, (querySnapshot) => {
      const usersData: User[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() } as User);
      });

      // Ensure the current admin user is always in the list, even if not in Firestore
      if (user && user.role === 'Admin' && !usersData.find(u => u.id === user.id)) {
        usersData.unshift(user);
      }

      setUsers(usersData);
    }, (error) => {
      console.error("Error fetching users:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch users." });
    });

    return () => unsubscribeUsers();
  }, [toast, canViewUsers, user]);

  return (
    <>
      <PageHeader
        title="Settings"
        description={`Manage your school's information, accounts, and system settings. System ID: ${schoolInfo?.systemId || 'N/A'}`}
      />
      <Tabs defaultValue="school-info" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="school-info">School Info</TabsTrigger>
          <TabsTrigger value="academic-year">Academic Year</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="fee-items">Fee Items</TabsTrigger>
          <TabsTrigger value="fee-structure">Fee Structure</TabsTrigger>
          {canViewUsers && <TabsTrigger value="users">User Management</TabsTrigger>}
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
        
        <TabsContent value="classes">
            <ClassSettings />
        </TabsContent>

        <TabsContent value="fee-items">
            <FeeItemsSettings />
        </TabsContent>
        
        <TabsContent value="fee-structure">
            <FeeStructureSettings />
        </TabsContent>

        {canViewUsers && (
          <TabsContent value="users">
              <UserManagementSettings users={users} />
          </TabsContent>
        )}

        <TabsContent value="integrations">
            <IntegrationsSettings />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesSettings />
        </TabsContent>
        
        <TabsContent value="billing">
          <BillingSettings />
        </TabsContent>
      </Tabs>
    </>
  );
}
