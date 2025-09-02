
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function AdmissionsPage() {
  return (
    <>
      <PageHeader
        title="Admissions"
        description="Manage new student admissions and applications."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Admission
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p>The admissions management feature is currently under development. Please check back later!</p>
        </CardContent>
      </Card>
    </>
  );
}
