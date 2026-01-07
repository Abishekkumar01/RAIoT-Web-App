import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/lib/contexts/AuthContext";
import { LoaderProvider } from "@/lib/contexts/LoaderContext";
import { ThemeProvider } from "@/components/theme-provider";
import TargetCursor from "@/components/ui/TargetCursorWrapper"; // Custom Cursor (client-only)
import WhatsAppButton from "@/components/ui/WhatsAppButton"; // WhatsApp Floating Button
import { Toaster } from "@/components/ui/toaster";
import TechScrollbar from "@/components/ui/TechScrollbar";
import Footer from "@/components/layout/Footer";
import { RoutePrefetcher } from "@/components/utils/RoutePrefetcher";

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${orbitron.variable} overflow-x-hidden`}>
        {/* Theme provider for light/dark mode */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Global custom cursor — active across the site */}
          <TargetCursor
            spinDuration={2}
            hideDefaultCursor={true}
            targetSelector=".cursor-target"
          />

          {/* AuthProvider wraps your app's routes */}
          <AuthProvider>
            <LoaderProvider>
              {children}
              {/* WhatsApp Help Desk Floating Button */}
              <WhatsAppButton />
              {/* Global Toaster for notifications */}
              <Toaster />
              {/* Tech Themed Scrollbars */}
              <TechScrollbar orientation="vertical" />
              <TechScrollbar orientation="horizontal" />
              <RoutePrefetcher />
              <Footer />
            </LoaderProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
