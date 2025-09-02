
'use client'

import React from 'react';
import Link from "next/link"
import { usePathname } from 'next/navigation'
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
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CreditCard,
  BarChart3,
  Settings,
  Bell,
  PanelLeft,
} from "lucide-react"

import { Button } from './ui/button';

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admissions", icon: UserPlus, label: "Admissions" },
  { href: "/students", icon: Users, label: "Students" },
  { href: "/payments", icon: CreditCard, label: "Payments" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
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

function Header({ children }: { children: React.ReactNode }) {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 sm:px-6">
      <SidebarTrigger className="md:hidden">
        <PanelLeft />
      </SidebarTrigger>
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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-8 w-8 text-primary">
                <path fill="currentColor" d="M12 3L1 9l4 2.18v6.32L1 21l11-6l11 6l-4-3.5V11.18L23 9L12 3zm0 2.31L19.53 9L12 12.69L4.47 9L12 5.31zM7 12.68v3.63l-2 1.12V13.8L7 12.68zm8 0l2 1.12v3.63l-2-1.12v-3.63z" />
            </svg>
            <span className="text-xl font-bold">CampusFlow</span>
          </div>
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
          <Header>{children}</Header>
          <main className="flex-1 p-4 sm:p-6 bg-background">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
