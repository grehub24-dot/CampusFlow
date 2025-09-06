
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
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
  SidebarRail,
  useSidebar
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
} from "lucide-react"

import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useSchoolInfo } from '@/context/school-info-context';
import { Skeleton } from './ui/skeleton';

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admissions", icon: UserPlus, label: "Admissions" },
  { href: "/students", icon: Users, label: "Students" },
  { href: "/payments", icon: CreditCard, label: "Payments" },
  { href: "/invoices", icon: Receipt, label: "Invoices" },
  { href: "/fees", icon: Receipt, label: "Fees" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
  { href: "/communications", icon: MessageSquare, label: "Communications" },
  { href: "/settings", icon: Settings, label: "Settings" },
];


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
    </SidebarMenu>
  );
}

function UserProfile() {
    return (
        <div className="flex w-full items-center gap-2 overflow-hidden p-2">
            <Avatar>
                <AvatarImage src="https://picsum.photos/id/237/40/40" alt="Admin" data-ai-hint="person" />
                <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            <div className="flex flex-col truncate">
                <span className="text-sm font-semibold text-sidebar-foreground">Admin User</span>
                <span className="text-xs text-sidebar-foreground/70">admin@campusflow.com</span>
            </div>
        </div>
    )
}

function Header() {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 sm:px-6">
        <SidebarTrigger />
        <div className="flex-1">
            {/* Can add breadcrumbs or page title here */}
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

    if (loading || !isClient) {
        return (
            <div className="flex items-center gap-2 p-2">
                <Skeleton className="h-8 w-10 rounded-md" />
                {state === 'expanded' && <Skeleton className="h-6 w-24" />}
            </div>
        );
    }
    
    return (
         <div className="flex items-center gap-2 p-2">
            <Image src={schoolInfo?.logoUrl || "https://picsum.photos/40/40"} width={40} height={32} alt="School Logo" className="h-8 w-10 rounded-md object-contain" data-ai-hint="logo" />
            <span className={cn("text-xl font-bold", state === 'collapsed' && 'hidden')}>{schoolInfo?.schoolName || 'CampusFlow'}</span>
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
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
