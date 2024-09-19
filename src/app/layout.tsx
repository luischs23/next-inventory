import type { Metadata } from "next";
import { Inter } from 'next/font/google'
import "./globals.css";
import { AuthProvider } from './context/AuthContext'
import Navbar from 'app/components/Navbar'
import { ThemeProvider } from 'app/components/ThemeProvider'

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
       <div className="flex md:flex-row">
         <AuthProvider>
          <Navbar />
          <main className="flex-1 md:ml-16 p-4 pb-20 md:pb-4">{children}</main>
          </AuthProvider>
        </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
