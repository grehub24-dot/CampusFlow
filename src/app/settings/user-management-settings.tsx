

'use client'

import * as React from "react"
import type { User } from "@/types"
import { useSchoolInfo } from "@/context/school-info-context"
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";


import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, Loader2 } from "lucide-react"
import { userColumns } from "./user-columns"
import { UserTable } from "./user-table"
import { ToastAction } from "@/components/ui/toast";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { UserForm, type FormValues as UserFormValues } from './user-form';
import type { SubmitHandler } from "react-hook-form";

const PLAN_LIMITS = {
  free: 1,
  starter: 3,
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
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);


  const handleAddUserClick = () => {
    if (user?.role !== 'Admin') {
        toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only Admins can add new users.' });
        return;
    }
    const limit = PLAN_LIMITS[schoolInfo?.currentPlan || 'free'];
    if (users.length >= limit) {
        toast({
            variant: "destructive",
            title: "User Limit Reached",
            description: `You have reached the ${limit} user limit for the ${schoolInfo?.currentPlan} plan.`,
            action: <ToastAction altText="Upgrade" asChild><Button variant="link" onClick={() => router.push('/billing')}>Upgrade Plan</Button></ToastAction>
        });
    } else {
        setIsFormOpen(true);
    }
  }

  const onSubmit: SubmitHandler<UserFormValues> = async (values) => {
    setIsSubmitting(true);
    const auth = getAuth();

    try {
        // 1. Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const newFirebaseUser = userCredential.user;

        // 2. Create user document in Firestore
        const userDocRef = doc(db, "users", newFirebaseUser.uid);
        await setDoc(userDocRef, {
            name: values.name,
            email: values.email,
            role: values.role,
            lastLogin: new Date().toISOString(),
        });
        
        toast({
            title: "User Created",
            description: `${values.name} has been added as a new ${values.role}.`
        });
        setIsFormOpen(false);

    } catch (error: any) {
        console.error("Error creating user:", error);
        let errorMessage = "Could not create user. Please try again.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "This email address is already in use by another account.";
        } else if (error.code === 'auth/weak-password') {
            errorMessage = "The password is too weak. Please use a stronger password.";
        }
        toast({
            variant: "destructive",
            title: "User Creation Failed",
            description: errorMessage
        });
    } finally {
        setIsSubmitting(false);
    }
  }


  return (
    <>
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
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>Create a new user account and assign them a role.</DialogDescription>
            </DialogHeader>
            <UserForm onSubmit={onSubmit} isSubmitting={isSubmitting} />
        </DialogContent>
    </Dialog>
    </>
  )
}
