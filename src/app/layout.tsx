import type { Metadata } from "next";
import { Inter } from 'next/font/google'
import "./globals.css";
import Navbar from 'app/components/shared/navbar/Navbar'
import { Toaster } from "app/components/ui/toaster"
import { authOptions  } from 'app/app/api/auth/[...nextauth]/route'
import { getServerSession } from "next-auth/next"
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Inventory Management System',
  description: 'A simple inventory management system',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers session={session}>
          <div className="flex flex-col min-h-screen">
            <div className="flex flex-1">
              <Navbar />
              <main className="flex-1 md:ml-16">{children}</main>
            </div>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}