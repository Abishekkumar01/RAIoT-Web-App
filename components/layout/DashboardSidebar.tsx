"use client";

import Link from "next/link";
import { useAuth } from "@/lib/contexts/AuthContext";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Bot,
  Home,
  User,
  Calendar,
  ClipboardList,
  Users,
  Settings,
  Shield,
  BarChart3,
  LogOut,
  Eye,
  ExternalLink,
  Image as ImageIcon,
  Archive,
  Mail,
  Rocket,
  Box,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const DashboardSidebar = () => {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const memberLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/profile", label: "Profile", icon: User },
    { href: "/dashboard/attendance", label: "Attendance", icon: ClipboardList },
    { href: "/dashboard/events", label: "Events", icon: Calendar },
    { href: "/dashboard/inventory", label: "Resources", icon: Box },
  ];

  const adminLinks = [
    { href: "/admin", label: "Admin Dashboard", icon: BarChart3 },
    { href: "/members", label: "Manage Members", icon: Users },
    { href: "/admin/events", label: "Manage Events", icon: Calendar },
    {
      href: "/admin/attendance",
      label: "Manage Attendance",
      icon: ClipboardList,
    },
    { href: "/admin/users", label: "Manage Users", icon: Users },

    { href: "/admin/trainees", label: "Manage Trainees", icon: Users },
    { href: "/admin/leaders", label: "Manage Leaders", icon: Shield },
    { href: "/admin/gallery", label: "Manage Gallery", icon: ImageIcon },
    { href: "/admin/inventory", label: "Manage Inventory", icon: Box },
    { href: "/admin/projects", label: "Manage Projects", icon: Rocket },
    { href: "/admin/contact", label: "Manage Contact", icon: Mail },
  ];

  const publicSiteLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/events", label: "Events", icon: Calendar },
    { href: "/projects", label: "Projects", icon: Bot },
    { href: "/leaders", label: "Our Leaders", icon: Users },
    { href: "/gallery", label: "Gallery", icon: Eye },
    { href: "/contact", label: "Contact", icon: User },
  ];

  const operationsLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/operations", label: "Operations Dashboard", icon: BarChart3 },
    { href: "/operations/my-events", label: "Events & Teams", icon: Calendar },
    { href: "/dashboard/inventory", label: "Resources", icon: Box },
    ...(user?.role === 'management_head' || user?.role === 'admin' || user?.role === 'superadmin' ? [
      { href: "/operations/inventory", label: "Manage Inventory", icon: Box },
    ] : []),
    { href: "/dashboard", label: "Club Dashboard", icon: Home },
    ...(user?.role === 'student_coordinator' || user?.role === 'admin' || user?.role === 'superadmin' ? [
      { href: "/operations/attendance", label: "Mark Attendance", icon: ClipboardList },
      { href: "/operations/history", label: "Attendance History", icon: Archive },
      { href: "/operations/manage-trainee", label: "Manage Trainee", icon: Users },
    ] : []),
    ...(user?.role === 'public_relation_head' || user?.role === 'admin' || user?.role === 'superadmin' ? [
      { href: "/operations/events", label: "Manage Events", icon: Calendar },
      { href: "/operations/gallery", label: "Manage Gallery", icon: ImageIcon },
    ] : []),
    { href: "/dashboard/profile", label: "My Profile", icon: User },
  ];

  let links = memberLinks;

  if (user?.role === "admin" || user?.role === "superadmin" || user?.role === "president" || user?.role === "vice_president") {
    links = [
      { href: "/admin", label: "Admin Dashboard", icon: BarChart3 },
      { href: "/dashboard", label: "Club Dashboard", icon: Home }, // Added for Admins too
      ...adminLinks.slice(1), // Keep rest of admin links
      { href: "/dashboard/profile", label: "My Profile", icon: User }
    ];
  } else if (["student_coordinator", "public_relation_head", "operations_head", "management_head"].includes(user?.role || "")) {
    links = operationsLinks;
  }

  return (
    <div className="flex flex-col h-full bg-card border-r">
      <div className="p-6">
        <Link href="/" className="flex items-center space-x-2">
          {/* <Bot className="h-8 w-8 text-primary" /> */}
          <span className="font-bold text-xl">IoT</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch={true}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{link.label}</span>
            </Link>
          );
        })}

        {/* View Public Site Section - Only for Admins */}
        {(user?.role === "admin" || user?.role === "superadmin") && (
          <>
            <div className="pt-4 mt-4 border-t">
              <div className="px-3 py-2 mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  View Public Site
                </span>
              </div>
              {publicSiteLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{link.label}</span>
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                );
              })}
            </div>
          </>
        )}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-medium">
              {user?.displayName?.charAt(0) || "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.displayName}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role}
            </p>
          </div>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
};
