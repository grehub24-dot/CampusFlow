
'use client'

import React from 'react';
import Link from "next/link"
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
  SidebarRail,
  useSidebar,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CreditCard,
  BarChart3,
  Settings,
  Bell,
  MessageSquare,
  Receipt,
  FileText,
  Briefcase,
  DollarSign,
  FileBarChart
} from "lucide-react"

import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useSchoolInfo } from '@/context/school-info-context';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import SubscriptionNotifier from './subscription-notifier';

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admissions", icon: UserPlus, label: "Admissions" },
  { href: "/students", icon: Users, label: "Students" },
  { href: "/staff", icon: Briefcase, label: "Staff" },
  { href: "/payments", icon: CreditCard, label: "Payments" },
  { href: "/invoices", icon: Receipt, label: "Invoices" },
  { href: "/fees", icon: FileText, label: "Fees" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
  { href: "/communications", icon: MessageSquare, label: "Communications" },
];

const secondaryNavItems = [
  { href: "/payroll", icon: DollarSign, label: "Payroll" },
  { href: "/income-expense", icon: DollarSign, label: "Income & Expense" },
  { href: "/financial-summary", icon: FileBarChart, label: "Financial Summary" },
  { href: "/billing", icon: CreditCard, label: "Billing" },
  { href: "/settings", icon: Settings, label: "Settings" },
]


function MainNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref>
            <SidebarMenuButton
              isActive={pathname.startsWith(item.href)}
              tooltip={item.label}
            >
              <item.icon />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
       <SidebarSeparator className="my-2" />
       {secondaryNavItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} passHref>
            <SidebarMenuButton
              isActive={pathname.startsWith(item.href)}
              tooltip={item.label}
            >
              <item.icon />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function UserProfile() {
    const { state } = useSidebar();
    const [isClient, setIsClient] = React.useState(false);

    React.useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return (
            <div className="flex w-full items-center gap-2 overflow-hidden p-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                </div>
            </div>
        )
    }

    return (
        <div className="flex w-full items-center gap-2 overflow-hidden p-2">
            <Avatar>
                <AvatarImage src="https://picsum.photos/id/237/40/40" alt="Admin" data-ai-hint="person" />
                <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            {state !== 'collapsed' && (
                <div className="flex flex-col truncate">
                    <span className="text-sm font-semibold text-sidebar-foreground">Admin User</span>
                    <span className="text-xs text-sidebar-foreground/70">admin@campusflow.com</span>
                </div>
            )}
        </div>
    )
}

function Header() {
  const { schoolInfo, loading } = useSchoolInfo();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 sm:px-6">
        <SidebarTrigger />
        <div className="flex-1">
             {(!isClient || loading) ? (
                <Skeleton className="h-6 w-24 rounded-md" />
            ) : (
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Plan:</span>
                    <Badge variant="outline" className="capitalize">{schoolInfo?.currentPlan || 'Free'}</Badge>
                </div>
            )}
        </div>
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Toggle notifications</span>
            </Button>
      </div>
    </header>
  );
}

function Brand() {
    const { state } = useSidebar();
    const { schoolInfo, loading } = useSchoolInfo();
    const [isClient, setIsClient] = React.useState(false);

    React.useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient || loading) {
        return (
             <div className="flex items-center gap-2 p-2">
                <Skeleton className="h-12 w-12 rounded-md" />
                 {state !== 'collapsed' && <Skeleton className="h-6 w-24 rounded-md" />}
            </div>
        );
    }
    
    return (
         <div className="flex items-center gap-3 p-2">
            <Image src={schoolInfo?.logoUrl || "https://picsum.photos/80/80"} width={48} height={48} alt="School Logo" className="h-12 w-12 rounded-md object-contain" data-ai-hint="logo" />
            
            {state !== 'collapsed' && (
                <span className="text-xl font-bold">{schoolInfo?.schoolName || 'CampusFlow'}</span>
            )}
          </div>
    )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarRail />
        <SidebarHeader>
         <Brand />
        </SidebarHeader>
        <SidebarContent>
          <MainNav />
        </SidebarContent>
        <SidebarFooter>
          <SidebarSeparator />
          <UserProfile />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 p-4 sm:p-6 bg-background">
            <SubscriptionNotifier />
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
