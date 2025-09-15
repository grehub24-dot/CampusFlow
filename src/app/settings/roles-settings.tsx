
'use client'

import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Role, RolePermissions } from '@/types';
import { useAuth } from '@/context/auth-context';
import { logActivity } from '@/lib/activity-logger';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const permissionSchema = z.object({
  read: z.boolean().optional(),
  create: z.boolean().optional(),
  update: z.boolean().optional(),
  delete: z.boolean().optional(),
  run: z.boolean().optional(),
});

const formSchema = z.object({
  dashboard: permissionSchema.optional(),
  admissions: permissionSchema.optional(),
  students: permissionSchema.optional(),
  staff: permissionSchema.optional(),
  payments: permissionSchema.optional(),
  invoices: permissionSchema.optional(),
  fees: permissionSchema.optional(),
  reports: permissionSchema.optional(),
  communications: permissionSchema.optional(),
  payroll: permissionSchema.optional(),
  transactions: permissionSchema.optional(),
  billing: permissionSchema.optional(),
  settings: permissionSchema.optional(),
  activity: permissionSchema.optional(),
});

type FormValues = z.infer<typeof formSchema>;

const permissionConfig = {
    dashboard: ['read'],
    admissions: ['read', 'create', 'update', 'delete'],
    students: ['read', 'create', 'update', 'delete'],
    staff: ['read', 'create', 'update', 'delete'],
    payments: ['read', 'create', 'update', 'delete'],
    invoices: ['read', 'create', 'update', 'delete'],
    fees: ['read', 'create', 'update', 'delete'],
    reports: ['read'],
    communications: ['read', 'create'],
    payroll: ['read', 'run'],
    transactions: ['read', 'create', 'update', 'delete'],
    billing: ['read', 'update'],
    settings: ['read', 'update'],
    activity: ['read'],
}

function RoleForm({ role, onSave, isSubmitting }: { role: Role; onSave: SubmitHandler<FormValues>; isSubmitting: boolean }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: role.permissions || {},
  });

  useEffect(() => {
    form.reset(role.permissions || {});
  }, [role, form]);
  
  const formatKey = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">
        <Accordion type="multiple" defaultValue={Object.keys(permissionConfig)} className="w-full">
          {Object.entries(permissionConfig).map(([feature, actions]) => (
            <AccordionItem value={feature} key={feature}>
              <AccordionTrigger>{formatKey(feature)}</AccordionTrigger>
              <AccordionContent className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                {actions.map(action => (
                   <FormField
                    key={`${feature}-${action}`}
                    control={form.control}
                    name={`${feature}.${action}` as any}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <FormLabel className="text-sm font-normal capitalize">{action}</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Permissions
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function RolesSettings({ roles }: { roles: Role[] }) {
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();
    
    useEffect(() => {
        if (roles.length > 0 && !selectedRole) {
            setSelectedRole(roles.find(r => r.name === 'Accountant') || roles[0]);
        }
    }, [roles, selectedRole]);

    const handleSavePermissions: SubmitHandler<FormValues> = async (data) => {
        if (!selectedRole) return;
        setIsSubmitting(true);
        try {
            const roleDocRef = doc(db, "roles", selectedRole.id);
            await updateDoc(roleDocRef, { permissions: data });
            await logActivity(user, 'Permissions Updated', `Updated permissions for the ${selectedRole.name} role.`);
            toast({
                title: 'Permissions Saved',
                description: `Permissions for the ${selectedRole.name} role have been updated.`,
            });
        } catch (error) {
            console.error("Error saving permissions:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not save permissions." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleRoleSelect = (roleName: string) => {
        setSelectedRole(roles.find(r => r.name === roleName) || null);
    }

    if (roles.length === 0) {
        return <Skeleton className="h-96 w-full" />;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Roles & Permissions</CardTitle>
                <CardDescription>Define what each user role can see and do within the system.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-4 gap-6">
                    <div className="md:col-span-1 flex flex-col gap-2">
                         {roles.sort((a,b) => a.name.localeCompare(b.name)).map(role => (
                            <Button 
                                key={role.id}
                                variant={selectedRole?.id === role.id ? 'default' : 'outline'}
                                onClick={() => handleRoleSelect(role.name)}
                                className="justify-start"
                            >
                                {role.name}
                            </Button>
                         ))}
                    </div>
                    <div className="md:col-span-3">
                        {selectedRole ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Permissions for {selectedRole.name}</CardTitle>
                                    <CardDescription>
                                        Select the actions this role can perform.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <RoleForm role={selectedRole} onSave={handleSavePermissions} isSubmitting={isSubmitting} />
                                </CardContent>
                            </Card>
                        ) : (
                           <div className="flex items-center justify-center h-full text-muted-foreground">Select a role to manage its permissions.</div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
