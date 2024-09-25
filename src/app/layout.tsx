import type { Metadata } from "next";
import { Inter } from 'next/font/google'
import "./globals.css";
import { AuthProvider } from './context/AuthContext'
import Navbar from 'app/components/Navbar'
import { ThemeProvider } from 'app/components/ThemeProvider'
import { Toaster } from "app/components/ui/toaster"
import { ProductProvider } from 'app/app/context/ProductContext'

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
            <ProductProvider>
              <div className="flex flex-col md:flex-row min-h-screen">
                <Navbar />
                <main className="flex-1 p-4 pb-16 md:ml-16">{children}</main>
              </div>
              <Toaster />
            </ProductProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}