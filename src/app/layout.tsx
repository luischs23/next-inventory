import type { Metadata } from "next";
import { Inter } from 'next/font/google'
import "./globals.css";
import { AuthProvider } from './context/AuthContext'
import Navbar from 'app/components/shared/navbar/Navbar'
import { ThemeProvider } from 'app/components/ThemeProvider'
import { Toaster } from "app/components/ui/toaster"
import { ProductProvider } from 'app/app/context/ProductContext'
import CreativeHeader from 'app/components/shared/header/CreativeHeader'

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
              <div className="flex flex-col min-h-screen">
                <CreativeHeader />
                <div className="flex flex-1">
                  <Navbar />
                  <main className="flex-1 p-1 pb-10 md:ml-16">{children}</main>
                </div>
              </div>
              <Toaster />
            </ProductProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}