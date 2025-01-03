import type { Metadata } from "next";
import { Inter } from 'next/font/google'
import "./globals.css";
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from 'app/components/ThemeProvider'
import { Toaster } from "app/components/ui/toaster"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Inventory Management System',
  description: 'A simple inventory management system',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}