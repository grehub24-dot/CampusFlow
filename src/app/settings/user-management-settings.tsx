
'use client'

import * as React from "react"
import type { User } from "@/types"
import { useSchoolInfo } from "@/context/school-info-context"
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { userColumns } from "./user-columns"
import { UserTable } from "./user-table"
import { ToastAction } from "../ui/toast";


const PLAN_LIMITS = {
  free: 1,
  starter: 2,
  pro: 5,
  enterprise: Infinity,
}

type UserManagementSettingsProps = {
    users: User[];
}

export function UserManagementSettings({ users }: UserManagementSettingsProps) {
  const { schoolInfo } = useSchoolInfo();
  const router = useRouter();
  const { toast } = useToast();

  const handleAddUserClick = () => {
    const limit = PLAN_LIMITS[schoolInfo?.currentPlan || 'free'];
    if (users.length >= limit) {
        toast({
            variant: "destructive",
            title: "User Limit Reached",
            description: `You have reached the ${limit} user limit for the ${schoolInfo?.currentPlan} plan.`,
            action: <ToastAction altText="Upgrade" asChild><Button variant="link" onClick={() => router.push('/billing')}>Upgrade Plan</Button></ToastAction>
        });
    } else {
        // Here you would open a dialog to add a new user.
        toast({
            title: "Add User",
            description: "User creation form would appear here.",
        });
    }
  }


  return (
    <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage all users with access to the system.</CardDescription>
                </div>
                 <Button onClick={handleAddUserClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add User
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <UserTable columns={userColumns} data={users} />
        </CardContent>
    </Card>
  )
}
