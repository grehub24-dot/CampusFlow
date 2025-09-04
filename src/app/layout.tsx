
import AppLayout from '@/components/app-layout';
import { Toaster } from "@/components/ui/toaster"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppLayout>{children}</AppLayout>
        <Toaster />
      </body>
    </html>
  );
}
