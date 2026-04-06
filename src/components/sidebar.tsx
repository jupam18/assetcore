"use client";

import { UserRole } from "@prisma/client";
import {
  BarChart2,
  Bell,
  ChevronRight,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Monitor,
  Settings,
  Shield,
  Users,
  Workflow,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Monitor;
  adminOnly?: boolean;
};

type NavSection = {
  label: string | null;
  adminOnly?: boolean;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: null,
    items: [
      { href: "/assets", label: "Assets", icon: Monitor },
      { href: "/reports", label: "Reports", icon: BarChart2 },
    ],
  },
  {
    label: "Administration",
    adminOnly: true,
    items: [
      { href: "/admin/users", label: "Users", icon: Users, adminOnly: true },
      { href: "/admin/lookups", label: "Lookup Lists", icon: LayoutDashboard, adminOnly: true },
      { href: "/admin/workflows", label: "Workflows", icon: Workflow, adminOnly: true },
      { href: "/admin/roles", label: "Role Builder", icon: KeyRound, adminOnly: true },
      { href: "/admin/notifications", label: "Notifications", icon: Bell, adminOnly: true },
      { href: "/admin/settings", label: "Settings", icon: Settings, adminOnly: true },
      { href: "/admin/audit", label: "Audit Log", icon: Shield, adminOnly: true },
    ],
  },
];

export function Sidebar({ role, userName }: { role: UserRole; userName?: string }) {
  const pathname = usePathname();
  const isAdmin = role === "GLOBAL_ADMIN";

  return (
    <aside className="w-[260px] flex flex-col bg-brand-800 shrink-0 relative">
      {/* Brand header */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-300 flex items-center justify-center">
            <Monitor className="w-4 h-4 text-brand-900" />
          </div>
          <div>
            <span className="text-[15px] font-semibold text-white tracking-tight">AssetCore</span>
            <p className="text-[11px] text-brand-300/70 leading-none mt-0.5">IT Asset Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-5 overflow-y-auto">
        {navSections.map((section, si) => {
          if (section.adminOnly && !isAdmin) return null;
          const items = section.items.filter((item) => !item.adminOnly || isAdmin);
          if (items.length === 0) return null;

          return (
            <div key={si}>
              {section.label && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-300/50 px-3 mb-1.5">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(href + "/");
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150
                        ${active
                          ? "bg-brand-300/15 text-brand-300 shadow-[inset_2px_0_0_0] shadow-brand-300"
                          : "text-brand-300/60 hover:bg-white/5 hover:text-brand-300/90"
                        }`}
                    >
                      <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${active ? "text-brand-300" : "text-brand-300/40 group-hover:text-brand-300/70"}`} />
                      <span className="flex-1">{label}</span>
                      {active && <ChevronRight className="w-3.5 h-3.5 text-brand-300/50" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-white/[0.06]">
        <Link
          href="/profile"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg mb-1 transition-all duration-150 group
            ${pathname === "/profile" ? "bg-brand-300/15" : "hover:bg-white/5"}`}
        >
          <div className="w-8 h-8 rounded-full bg-brand-300/20 flex items-center justify-center text-brand-300 text-xs font-bold shrink-0">
            {(userName ?? "U")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-white/90 truncate group-hover:text-white transition-colors">{userName ?? "User"}</p>
            <p className="text-[11px] text-brand-300/50">{role.replace(/_/g, " ")}</p>
          </div>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-brand-300/50 hover:bg-white/5 hover:text-brand-300/80 transition-all duration-150"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
