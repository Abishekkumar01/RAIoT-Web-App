import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/lib/contexts/AuthContext";
import { LoaderProvider } from "@/lib/contexts/LoaderContext";
import { ThemeProvider } from "@/components/theme-provider";

import WhatsAppButton from "@/components/ui/WhatsAppButton"; // WhatsApp Floating Button
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import TechScrollbar from "@/components/ui/TechScrollbar";
import Footer from "@/components/layout/Footer";
import { RoutePrefetcher } from "@/components/utils/RoutePrefetcher";

import TechCursor from "@/components/ui/TechCursor";
import MaintenanceGuard from "@/components/auth/MaintenanceGuard";

// Google font
const inter = Inter({ subsets: ["latin"] });
const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "500", "600", "700", "800", "900"],
});

// Metadata for Next.js
export const metadata: Metadata = {
  title: "RAIoT - Robotics, Automation & IoT Club",
  description: "University club for Robotics, Automation, and IoT enthusiasts",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${orbitron.variable} overflow-x-hidden`} suppressHydrationWarning>
        {/* Theme provider for light/dark mode */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Global custom cursor — active across the site */}
          <TechCursor />

          {/* AuthProvider wraps your app's routes */}
          <AuthProvider>
            <LoaderProvider>
              <MaintenanceGuard>
                {children}
                {/* WhatsApp Help Desk Floating Button */}
                <WhatsAppButton />
                {/* Tech Themed Scrollbars */}
                <TechScrollbar orientation="vertical" />
                <TechScrollbar orientation="horizontal" />
                <RoutePrefetcher />
                <Footer />
              </MaintenanceGuard>

              {/* Elements that should stay 1:1 (Outside Zoom) */}
              <Toaster />
              <SonnerToaster position="bottom-right" richColors />
            </LoaderProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
