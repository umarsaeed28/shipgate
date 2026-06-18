import type { Metadata } from "next";
import "./globals.css";
import { roleCan } from "@qa/auth";
import { clientConfig } from "@qa/config/client";
import { NAV_ITEMS } from "../lib/nav";
import { getSession } from "../lib/session";
import { DEMO_MODE } from "../lib/demo";
import { Sidebar } from "./components/Sidebar";
import { RoleSwitch } from "./components/RoleSwitch";

export const metadata: Metadata = {
  title: "Shipgate QA — workspace",
  description: "AI-managed QA workspace",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.requires || roleCan(session.role, item.requires),
  );

  return (
    <html lang="en">
      <body>
        <div className="shell">
          <Sidebar items={visibleItems} />
          <div className="main">
            <header className="topbar">
              <div className="client">
                {clientConfig.slug.toUpperCase()}
                <span className="slug">{clientConfig.basePath}</span>
              </div>
              <RoleSwitch current={session.role} />
            </header>
            {DEMO_MODE ? (
              <div className="demo-banner">
                Read only demo · sample data · switch roles to explore. Changes are
                disabled.
              </div>
            ) : null}
            <main className="content">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
