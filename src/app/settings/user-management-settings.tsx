
'use client'

import * as React from "react"
import type { User } from "@/types"
import { useSchoolInfo } from "@/context/school-info-context"
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { sendSms } from "@/lib/frog-api";
import { logActivity } from "@/lib/activity-logger";
import { v4 as uuidv4 } from 'uuid';


import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, Loader2, Trash2 } from "lucide-react"
import { getUserColumns } from "./user-columns"
import { UserTable } from "./user-table"
import { ToastAction } from "@/components/ui/toast";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
  const { user, hasPermission, updateUserStatus, deleteUserAccount } = useAuth();
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isSupportFormOpen, setIsSupportFormOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [userToDeactivate, setUserToDeactivate] = React.useState<User | null>(null);
  const [userToDelete, setUserToDelete] = React.useState<User | null>(null);


  const canCreate = hasPermission('settings:create');
  const canUpdate = hasPermission('settings:update');
  const canDelete = hasPermission('settings:delete');


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

  const handleDeactivateUser = (userToToggle: User) => {
    setUserToDeactivate(userToToggle);
  }
  
  const handleDeleteUser = (userToDelete: User) => {
    setUserToDelete(userToDelete);
  }
  
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
    try {
      if (selectedUser) {
        // Update existing user
        const userDocRef = doc(db, "users", selectedUser.id);
        await updateDoc(userDocRef, {
          name: values.name,
          role: values.role,
        });

        // Also update the name in the staff collection if they are a teacher
        if (values.role === 'Teacher') {
            const staffDocRef = doc(db, "staff", selectedUser.id);
            await updateDoc(staffDocRef, { name: values.name, role: 'Teacher' });
        }
        
        await logActivity(user, 'User Updated', `Updated user: ${values.name}.`);
        toast({ title: "User Updated", description: `${values.name}'s details have been updated.` });
      } else {
        // Create new user
        const auth = getAuth();
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password!);
        const newFirebaseUser = userCredential.user;
        
        const userDocRef = doc(db, "users", newFirebaseUser.uid);
        await setDoc(userDocRef, {
          name: values.name,
          email: values.email,
          role: values.role,
          lastLogin: new Date().toISOString(),
          disabled: false,
        });

        // If the new user is a Teacher, create a corresponding staff entry
        if (values.role === 'Teacher') {
          const staffDocRef = doc(db, "staff", newFirebaseUser.uid);
          await setDoc(staffDocRef, {
            id: newFirebaseUser.uid,
            name: values.name,
            role: 'Teacher',
            status: 'Active',
            payrollId: `STAFF-${uuidv4().substring(0, 8).toUpperCase()}`,
            // Set default empty/zero values for other required staff fields
            grossSalary: 0,
            ssnitEmployee: 0,
            ssnitEmployer: 0,
            taxableIncome: 0,
            incomeTax: 0,
            netSalary: 0,
            employmentDate: new Date().toISOString(),
          });
        }

        await logActivity(user, 'User Created', `Created a new user: ${values.name} with role ${values.role}.`);
        toast({ title: "User Created", description: `${values.name} has been added as a new ${values.role}.` });
        
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
      toast({ variant: "destructive", title: "Action Failed", description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeactivation = async () => {
    if (!userToDeactivate) return;
    setIsSubmitting(true);
    const newStatus = !userToDeactivate.disabled;
    try {
        await updateUserStatus(userToDeactivate.id, newStatus);
        const action = newStatus ? 'Deactivated' : 'Re-activated';
        await logActivity(user, `User ${action}`, `Set status for ${userToDeactivate.name} to ${newStatus ? 'Inactive' : 'Active'}.`);
        toast({ title: `User ${action}`, description: `${userToDeactivate.name} has been ${action.toLowerCase()}.` });
    } catch (error) {
        console.error(`Error ${newStatus ? 'deactivating' : 're-activating'} user:`, error);
        toast({ variant: "destructive", title: "Error", description: "Could not update user status." });
    } finally {
        setIsSubmitting(false);
        setUserToDeactivate(null);
    }
  }
  
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsSubmitting(true);
    try {
        await deleteUserAccount(userToDelete.id);
        await logActivity(user, 'User Deleted', `Permanently deleted user: ${userToDelete.name}.`);
        toast({ title: "User Deleted", description: "The user account has been permanently deleted from Firestore." });
    } catch (error) {
         console.error("Error deleting user:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not delete user account." });
    } finally {
        setIsSubmitting(false);
        setUserToDelete(null);
    }
  }


  const columns = React.useMemo(() => getUserColumns({ onEdit: handleEditUser, onDeactivate: handleDeactivateUser, onDelete: handleDeleteUser, canEdit: canUpdate }), [canUpdate]);


  return (
    <>
    <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage all users with access to the system.</CardDescription>
                </div>
                {canCreate && (
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
    
    <AlertDialog open={!!userToDeactivate} onOpenChange={(open) => !open && setUserToDeactivate(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will {userToDeactivate?.disabled ? 're-activate' : 'deactivate'} the user's account. They will {userToDeactivate?.disabled ? 'regain' : 'lose'} access to the system.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDeactivation} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : userToDeactivate?.disabled ? 'Re-activate' : 'Deactivate'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    
    <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete User Permanently?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action is irreversible and will permanently delete the user's account and all associated data.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleConfirmDelete} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete Forever'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  )
}

    