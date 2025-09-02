
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Users, Milestone, Calendar, BookOpen, Wallet, Clock } from "lucide-react";
import StatCard from "@/components/dashboard/stat-card";
import OverviewChart from "@/components/dashboard/overview-chart";
import GenderRatioPieChart from "@/components/dashboard/gender-ratio-pie-chart";
import { RecentPaymentsTable } from "./recent-payments-table";
import { recentPayments, pendingInvoices } from "@/lib/data";
import { paymentColumns } from "./payment-columns";
import { PendingInvoicesTable } from "./pending-invoices-table";
import { invoiceColumns } from "./invoice-columns";

export default function Dashboard() {
  const overallStats = {
    totalStudents: 1250,
    maleStudents: 640,
    femaleStudents: 610,
    totalRevenue: 550000,
    pendingInvoices: 25000,
  };
  
  const admissionStats = {
    totalNewStudents: 152,
    maleStudents: 78,
    femaleStudents: 74,
  };

  const classEnrollment = [
    { name: 'Grade 1', students: 120 },
    { name: 'Grade 2', students: 115 },
    { name: 'Grade 3', students: 130 },
    { name: 'Grade 4', students: 110 },
    { name: 'Grade 5', students: 125 },
    { name: 'Grade 6', students: 100 },
    { name: 'Grade 7', students: 95 },
    { name: 'Grade 8', students: 90 },
    { name: 'Grade 9', students: 85 },
    { name: 'Grade 10', students: 80 },
    { name: 'Grade 11', students: 75 },
    { name: 'Grade 12', students: 70 },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Welcome! Here's a summary of your school's data."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard 
            title="Academic Year"
            value="2023-2024"
            icon={Calendar}
        />
        <StatCard 
            title="Current Session"
            value="1st Term"
            icon={BookOpen}
        />
        <StatCard 
            title="Total Revenue"
            value={`GHS ${overallStats.totalRevenue.toLocaleString()}`}
            icon={Wallet}
        />
        <StatCard 
            title="Pending Invoices"
            value={`GHS ${overallStats.pendingInvoices.toLocaleString()}`}
            icon={Clock}
        />
      </div>

      <Tabs defaultValue="overall" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overall">Overall Analytics</TabsTrigger>
          <TabsTrigger value="admissions">This Year's Admissions</TabsTrigger>
        </TabsList>
        <TabsContent value="overall" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Total Students"
              value={overallStats.totalStudents.toLocaleString()}
              icon={Users}
            />
            <StatCard
              title="Male Students"
              value={overallStats.maleStudents.toLocaleString()}
              icon={User}
              color="text-blue-500"
            />
            <StatCard
              title="Female Students"
              value={overallStats.femaleStudents.toLocaleString()}
              icon={User}
              color="text-pink-500"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Class Enrollment</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <OverviewChart data={classEnrollment} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <GenderRatioPieChart data={{ male: overallStats.maleStudents, female: overallStats.femaleStudents }} />
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RecentPaymentsTable columns={paymentColumns} data={recentPayments} />
              <PendingInvoicesTable columns={invoiceColumns} data={pendingInvoices} />
          </div>
        </TabsContent>
        <TabsContent value="admissions" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard
                title="New Students"
                value={admissionStats.totalNewStudents.toLocaleString()}
                icon={Milestone}
                />
                <StatCard
                title="Male Students"
                value={admissionStats.maleStudents.toLocaleString()}
                icon={User}
                color="text-blue-500"
                />
                <StatCard
                title="Female Students"
                value={admissionStats.femaleStudents.toLocaleString()}
                icon={User}
                color="text-pink-500"
                />
            </div>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>New Student Enrollment</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <OverviewChart data={classEnrollment.map(c => ({...c, students: Math.floor(c.students * (admissionStats.totalNewStudents/overallStats.totalStudents) * (1 + (Math.random() - 0.5) * 0.2))}))} />
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Admission Gender Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <GenderRatioPieChart data={{ male: admissionStats.maleStudents, female: admissionStats.femaleStudents }} />
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
