import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShipGate QA — AI-managed quality assurance",
  description:
    "An AI-powered managed-QA platform. Claude-driven agents write tests, classify regressions, and surface trends — with a human QA lead in the loop.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
