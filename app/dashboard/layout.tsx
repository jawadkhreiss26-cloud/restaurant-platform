import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/pipeline", label: "CRM Pipeline" },
  { href: "/dashboard/previews", label: "Private Demos" },
  { href: "/dashboard/outreach", label: "Manual Outreach Queue" },
  { href: "/dashboard/inbox", label: "Meta Inbox" },
  { href: "/dashboard/payments", label: "Payments" },
  { href: "/dashboard/published", label: "Published Websites" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/audit-logs", label: "Audit Logs" },
  { href: "/dashboard/settings", label: "Settings & Integrations" }
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-white border-r shrink-0 p-4">
        <div className="font-semibold mb-1">Iraq Restaurant Platform</div>
        <div className="text-xs text-gray-500 mb-6">
          {session.name} · {session.role}
        </div>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded text-sm hover:bg-brand-50 text-gray-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action="/api/auth/logout" method="post" className="mt-8">
          <button className="text-xs text-gray-500 underline">Sign out</button>
        </form>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
