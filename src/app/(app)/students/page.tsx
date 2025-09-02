
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Upload, Download } from "lucide-react";

import { students } from "@/lib/data";
import { columns } from "./columns";
import { DataTable } from "./data-table";

export default function StudentsPage() {
  return (
    <>
      <PageHeader
        title="Students"
        description="View and manage all students in the system."
      >
        <div className="flex items-center gap-2">
            <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Import
            </Button>
            <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
            </Button>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Student
            </Button>
        </div>
      </PageHeader>
      <DataTable columns={columns} data={students} />
    </>
  );
}
