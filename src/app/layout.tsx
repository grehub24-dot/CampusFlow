import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppLayout from '@/components/app-layout';
import { SchoolInfoProvider } from '@/context/school-info-context';
import { AuthProvider } from '@/context/auth-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CampusFlow',
  description: 'A modern school management system.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <SchoolInfoProvider>
            <AppLayout>{children}</AppLayout>
          </SchoolInfoProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
