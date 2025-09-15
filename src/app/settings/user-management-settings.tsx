

'use client'

import * as React from "react"
import type { User } from "@/types"
import { useSchoolInfo } from "@/context/school-info-context"
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { sendSms } from "@/lib/frog-api";
import { logActivity } from "@/lib/activity-logger";


import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, Loader2 } from "lucide-react"
import { getUserColumns } from "./user-columns"
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
  const [isSupportFormOpen, setIsSupportFormOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  const canManageUsers = user?.role === 'Admin';


  const handleAddUserClick = () => {
    if (user?.role !== 'Admin') {
        toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only Admins can add new users.' });
        return;
    }
    const limit = PLAN_LIMITS[schoolInfo?.currentPlan || 'free'];
    // Exclude system accounts from the user count for the purpose of checking the limit
    const billableUsers = users.filter(u => u.email !== 'superadmin@campusflow.com' && u.email !== 'support@campusflow.com');
    
    if (billableUsers.length >= limit) {
        toast({
            variant: "destructive",
            title: "User Limit Reached",
            description: `You have reached the ${limit} user limit for the ${schoolInfo?.currentPlan} plan.`,
            action: <ToastAction altText="Upgrade" asChild><Button variant="link" onClick={() => router.push('/billing')}>Upgrade Plan</Button></ToastAction>
        });
    } else {
        setSelectedUser(null);
        setIsFormOpen(true);
    }
  }

  const handleEditUser = (userToEdit: User) => {
    setSelectedUser(userToEdit);
    setIsFormOpen(true);
  };
  
  const handleFormDialogClose = (open: boolean) => {
    if(!open) {
        setSelectedUser(null);
    }
    setIsFormOpen(open);
  }

  const handleAddSupportUserClick = () => {
     if (user?.role !== 'Admin') {
        toast({ variant: 'destructive', title: 'Permission Denied', description: 'Only Admins can add new users.' });
        return;
    }
    setIsSupportFormOpen(true);
  }

  const onSubmit: SubmitHandler<UserFormValues> = async (values) => {
    setIsSubmitting(true);
    const auth = getAuth();

    try {
        if (selectedUser) {
            // Update user in Firestore
            const userDocRef = doc(db, "users", selectedUser.id);
            await updateDoc(userDocRef, {
                name: values.name,
                role: values.role,
            });
            await logActivity(user, 'User Updated', `Updated user: ${values.name}.`);
            toast({ title: "User Updated", description: `${values.name}'s details have been updated.` });

        } else {
            // Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password!);
            const newFirebaseUser = userCredential.user;

            // Create user document in Firestore
            const userDocRef = doc(db, "users", newFirebaseUser.uid);
            await setDoc(userDocRef, {
                name: values.name,
                email: values.email,
                role: values.role,
                lastLogin: new Date().toISOString(),
            });
            
            await logActivity(user, 'User Created', `Created a new user: ${values.name} with role ${values.role}.`);

            toast({
                title: "User Created",
                description: `${values.name} has been added as a new ${values.role}.`
            });
            
            // Send admin notification
            const adminPhoneNumber = '0536282694';
            const limit = PLAN_LIMITS[schoolInfo?.currentPlan || 'free'];
            const currentCount = users.filter(u => u.email !== 'superadmin@campusflow.com' && u.email !== 'support@campusflow.com').length + 1;
            const message = `New User Created: ${values.name} (${values.role}). Total users: ${currentCount}/${limit} on ${schoolInfo?.currentPlan} plan.`;
            await sendSms([adminPhoneNumber], message, schoolInfo?.systemId);
        }

        setIsFormOpen(false);
        setIsSupportFormOpen(false);
        setSelectedUser(null);

    } catch (error: any) {
        console.error("Error creating/updating user:", error);
        let errorMessage = "Could not save user details. Please try again.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "This email address is already in use by another account.";
        } else if (error.code === 'auth/weak-password') {
            errorMessage = "The password is too weak. Please use a stronger password.";
        }
        toast({
            variant: "destructive",
            title: "Action Failed",
            description: errorMessage
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  const columns = React.useMemo(() => getUserColumns({ onEdit: handleEditUser, canEdit: canManageUsers }), [canManageUsers]);


  return (
    <>
    <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage all users with access to the system.</CardDescription>
                </div>
                {canManageUsers && (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleAddSupportUserClick}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create Support User
                        </Button>
                        <Button onClick={handleAddUserClick}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add User
                        </Button>
                    </div>
                )}
            </div>
        </CardHeader>
        <CardContent>
            <UserTable columns={columns} data={users} />
        </CardContent>
    </Card>
    <Dialog open={isFormOpen} onOpenChange={handleFormDialogClose}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{selectedUser ? 'Edit User' : 'Add New User'}</DialogTitle>
                <DialogDescription>{selectedUser ? "Update the user's name and role." : "Create a new user account and assign them a role."}</DialogDescription>
            </DialogHeader>
            <UserForm onSubmit={onSubmit} isSubmitting={isSubmitting} defaultValues={selectedUser || undefined} />
        </DialogContent>
    </Dialog>
    <Dialog open={isSupportFormOpen} onOpenChange={setIsSupportFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add Support User</DialogTitle>
                <DialogDescription>Create a new user account with the Support role.</DialogDescription>
            </DialogHeader>
            <UserForm onSubmit={onSubmit} isSubmitting={isSubmitting} isSupportForm={true} />
        </DialogContent>
    </Dialog>
    </>
  )
}
