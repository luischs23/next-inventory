"use client"; 

import { Inter } from 'next/font/google';
import "./globals.css";
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from 'app/components/ThemeProvider';
import { Toaster } from "app/components/ui/toaster";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Enlazando el manifest.json */}
        <link rel="manifest" href="/manifest.json" />
      </head>
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