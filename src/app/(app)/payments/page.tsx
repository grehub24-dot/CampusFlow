
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function PaymentsPage() {
  return (
    <>
      <PageHeader
        title="Payments"
        description="Manage all financial transactions and invoices."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Payment
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p>The payments and invoicing feature is currently under development. Please check back later!</p>
        </CardContent>
      </Card>
    </>
  );
}
