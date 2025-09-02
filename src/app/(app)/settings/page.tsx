
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { users } from "@/lib/data";
import { UserTable } from "./user-table";
import { userColumns } from "./user-columns";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your school's information, user accounts, and system settings."
      />
      <Tabs defaultValue="school-info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="school-info">School Info</TabsTrigger>
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
