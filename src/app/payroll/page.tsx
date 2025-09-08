
'use client'

import React from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase } from "lucide-react";

export default function PayrollPage() {

  return (
    <>
      <PageHeader
        title="Payroll Management"
        description="Manage staff salaries, deductions, and payment schedules."
      />
      <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
        <Card className="text-center w-full max-w-md bg-transparent shadow-none border-none">
            <CardHeader>
                 <div className="mx-auto bg-muted rounded-full p-4">
                    <Briefcase className="h-12 w-12 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4 text-2xl">Payroll Feature Coming Soon</CardTitle>
                <CardDescription>This section is under active development. You'll soon be able to manage all aspects of your school's payroll right here.</CardDescription>
            </CardHeader>
        </Card>
      </div>
    </>
  );
}
