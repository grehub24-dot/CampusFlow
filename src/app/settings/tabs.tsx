
'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { SchoolInfoSettings } from "./school-info-settings"
import { AcademicSettings } from "./academic-settings"
import { ClassSettings } from "./class-settings"
import { FeeItemsSettings } from "./fee-items-settings"
import { FeeStructureSettings } from "./fee-structure-settings"
import { UserManagementSettings } from "./user-management-settings"
import { IntegrationsSettings } from "./integrations-settings"
import { TemplatesSettings } from "./templates-settings"
import { BillingSettings } from "./billing-settings"

export default function SettingsTabs() {
  return (
    <Tabs defaultValue="school-info" className="space-y-4">
      <TabsList className="h-auto flex-wrap justify-start">
        <TabsTrigger value="school-info">School Info</TabsTrigger>
        <TabsTrigger value="academic-year">Academic Year</TabsTrigger>
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
        <UserManagementSettings />
      </TabsContent>
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
  )
}
