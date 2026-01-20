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
import { Switch } from "@/components/ui/switch";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { Loader2, Construction } from "lucide-react";

export const DashboardSidebar = ({ onClose }: { onClose?: () => void }) => {
  const { user, logout } = useAuth();
  const { isMaintenanceMode, toggleMaintenanceMode, loading: maintenanceLoading } = useMaintenanceMode();
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
    { href: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
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
      { href: "/dashboard", label: "Club Dashboard", icon: Home },
      ...adminLinks.slice(1),
      { href: "/dashboard/profile", label: "My Profile", icon: User }
    ];
  } else if (["student_coordinator", "public_relation_head", "operations_head", "management_head"].includes(user?.role || "")) {
    links = operationsLinks;
  }

  return (
    <div className="flex flex-col h-full bg-card border-r w-full relative">
      {/* Header - Compressed */}
      <div className="p-3 md:p-6 flex justify-center md:justify-start shrink-0">
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-bold text-sm md:text-xl">RAIoT</span>
        </Link>
      </div>

      <nav className="flex-1 px-2 md:px-4 space-y-1 md:space-y-2 overflow-y-auto overflow-x-hidden pb-32 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              prefetch={true}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate leading-tight">{link.label}</span>
            </Link>
          );
        })}

        {["admin", "superadmin", "president", "vice_president"].includes(user?.role || "") && (
          <>
            <div className="pt-2 mt-2 md:pt-4 md:mt-4 border-t">
              <div className="px-2 md:px-3 py-1 md:py-2 mb-1 md:mb-2">
                <span className="text-[9px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                  Public Site
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
                      "flex items-center space-x-1.5 md:space-x-3 px-2 py-1.5 md:px-3 md:py-2 rounded-lg font-medium transition-colors",
                      "text-[10px] md:text-sm",
                      "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 md:h-5 md:w-5 shrink-0" />
                    <span className="truncate leading-tight">{link.label}</span>
                    <ExternalLink className="h-2 w-2 md:h-3 md:w-3 ml-auto opacity-50" />
                  </a>
                );
              })}
            </div>

            <div className="pt-2 mt-2 md:pt-4 md:mt-4 border-t px-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Construction className="h-4 w-4 text-red-500 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] md:text-sm font-semibold text-red-500 truncate">Maintenance</span>
                    <span className="text-[8px] md:text-[10px] text-muted-foreground truncate">
                      {isMaintenanceMode ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                {maintenanceLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Switch
                    checked={isMaintenanceMode}
                    onCheckedChange={toggleMaintenanceMode}
                    className="bg-red-500/20 data-[state=checked]:bg-red-500"
                  />
                )}
              </div>
            </div>
          </>
        )}
      </nav>

      <div className="absolute bottom-0 left-0 w-full bg-card border-t p-2 md:p-4 z-20">
        <div className="flex items-center space-x-2 md:space-x-3 mb-2 md:mb-4">
          <div className="w-6 h-6 md:w-8 md:h-8 bg-primary rounded-full flex items-center justify-center shrink-0 overflow-hidden relative">
            {user?.profileData?.photoUrl ? (
              <img
                src={user.profileData.photoUrl}
                alt={user.displayName || "User"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-primary-foreground text-[10px] md:text-sm font-medium">
                {user?.displayName?.charAt(0) || "U"}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-[10px] md:text-sm font-medium truncate">{user?.displayName}</p>
            <p className="text-[8px] md:text-xs text-muted-foreground capitalize truncate">
              {user?.role}
            </p>
          </div>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          size="sm"
          className="w-full h-7 md:h-9 text-[10px] md:text-sm px-2"
        >
          <LogOut className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
};
