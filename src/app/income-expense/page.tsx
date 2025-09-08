
'use client'

import React from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

export default function IncomeExpensePage() {

  return (
    <>
      <PageHeader
        title="Income & Expense Tracking"
        description="Monitor your school's financial health by tracking income and expenses."
      />
      <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
        <Card className="text-center w-full max-w-md bg-transparent shadow-none border-none">
            <CardHeader>
                 <div className="mx-auto bg-muted rounded-full p-4">
                    <DollarSign className="h-12 w-12 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4 text-2xl">Income & Expense Tracking</CardTitle>
                <CardDescription>This feature is coming soon. The next step is to build the UI for logging transactions and viewing financial reports.</CardDescription>
            </CardHeader>
        </Card>
      </div>
    </>
  );
}
