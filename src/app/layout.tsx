"use client"; 

import { Inter } from 'next/font/google';
import { useEffect } from "react";
import "./globals.css";
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from 'app/components/ThemeProvider';
import { Toaster } from "app/components/ui/toaster";
import { useUserActivity } from "app/hooks/useUserActivity"

const inter = Inter({ subsets: ['latin'] });

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  useUserActivity()

  return <>{children}</>
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js")
        .then(() => console.log("Service Worker registrado!"))
        .catch((err) => console.error("Error registrando Service Worker:", err));
    }
  }, []);

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
            <RootLayoutContent>{children}</RootLayoutContent>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}