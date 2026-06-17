"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "../../lib/nav";

export function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="dot" />
        ShipGate QA
      </div>

      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item${active ? " active" : ""}`}
          >
            <span className="ico">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}

      <div className="spacer" />
      <div className="foot">Managed-QA workspace · MVP</div>
    </aside>
  );
}
