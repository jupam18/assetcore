"use client";

import { UserRole } from "@prisma/client";
import {
  LayoutDashboard,
  Monitor,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/assets", label: "Assets", icon: Monitor },
  { href: "/admin/users", label: "Users", icon: Users, adminOnly: true },
  {
    href: "/admin/lookups",
    label: "Lookup Lists",
    icon: LayoutDashboard,
    adminOnly: true,
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    adminOnly: true,
  },
  {
    href: "/admin/audit",
    label: "Audit Log",
    icon: Shield,
    adminOnly: true,
  },
];

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const isAdmin = role === "GLOBAL_ADMIN";

  const visible = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="w-56 flex flex-col bg-white border-r border-gray-200 shrink-0">
      <div className="px-4 py-5 border-b border-gray-200">
        <span className="text-lg font-semibold text-gray-900">AssetCore</span>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {visible.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 py-4 border-t border-gray-200">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
