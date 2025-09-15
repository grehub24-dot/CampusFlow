
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
  FileBarChart,
  LogOut,
  Loader2,
  ListOrdered,
} from "lucide-react"

import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useSchoolInfo } from '@/context/school-info-context';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import SubscriptionNotifier from './subscription-notifier';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", permission: "dashboard:read" },
  { href: "/admissions", icon: UserPlus, label: "Admissions", permission: "admissions:read" },
  { href: "/students", icon: Users, label: "Students", permission: "students:read" },
  { href: "/staff", icon: Briefcase, label: "Staff", permission: "staff:read" },
  { href: "/payments", icon: CreditCard, label: "Payments", permission: "payments:read" },
  { href: "/invoices", icon: Receipt, label: "Invoices", permission: "invoices:read" },
  { href: "/fees", icon: FileText, label: "Fees", permission: "fees:read" },
  { href: "/reports", icon: BarChart3, label: "Reports", permission: "reports:read" },
  { href: "/communications", icon: MessageSquare, label: "Communications", permission: "communications:read" },
];

const secondaryNavItems = [
  { href: "/payroll", icon: DollarSign, label: "Payroll", permission: "payroll:read" },
  { href: "/income-expense", icon: DollarSign, label: "Income & Expense", permission: "transactions:read" },
  { href: "/financial-summary", icon: FileBarChart, label: "Financial Summary", permission: "reports:read" },
  { href: "/billing", icon: CreditCard, label: "Billing", permission: "billing:read" },
  { href: "/settings", icon: Settings, label: "Settings", permission: "settings:read" },
  { href: "/activity-log", icon: ListOrdered, label: "Activity Log", permission: "activity:read" },
]


function MainNav() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();

  const filteredNavItems = navItems.filter(item => hasPermission(item.permission));
  const filteredSecondaryNavItems = secondaryNavItems.filter(item => hasPermission(item.permission));


  return (
    <SidebarMenu>
      {filteredNavItems.map((item) => (
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
       {(filteredNavItems.length > 0 && filteredSecondaryNavItems.length > 0) && <SidebarSeparator className="my-2" />}
       {filteredSecondaryNavItems.map((item) => (
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
    const { user, signOut } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        setIsClient(true);
    }, []);
    
    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    }

    if (!isClient || !user) {
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
    
    const fallback = user.name ? user.name.split(' ').map(n => n[0]).join('') : (user.email?.[0] || 'U').toUpperCase();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                 <div className="flex w-full items-center gap-2 overflow-hidden p-2 cursor-pointer hover:bg-sidebar-accent rounded-md">
                    <Avatar>
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name || user.email}`} alt="Admin" data-ai-hint="person" />
                        <AvatarFallback>{fallback}</AvatarFallback>
                    </Avatar>
                    {state !== 'collapsed' && (
                        <div className="flex flex-col truncate">
                            <span className="text-sm font-semibold text-sidebar-foreground">{user.name || 'User'}</span>
                            <span className="text-xs text-sidebar-foreground/70">{user.email}</span>
                        </div>
                    )}
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start">
                <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2" />
                    Log out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
       
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
            <Image src={schoolInfo?.logoUrl || "/logo.jpg"} width={48} height={48} alt="School Logo" className="h-12 w-12 rounded-md object-contain" data-ai-hint="logo graduation cap" />
            
            {state !== 'collapsed' && (
                <span className="text-xl font-bold">{schoolInfo?.schoolName || 'CampusFlow'}</span>
            )}
          </div>
    )
}

function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, loading, router, pathname]);

  if (loading || (!user && pathname !== '/login')) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (pathname === '/login') {
    return <>{children}</>;
  }

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

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedAppLayout>{children}</ProtectedAppLayout>
    )
}
