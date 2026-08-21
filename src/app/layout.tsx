import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Liara Copilot — Build, deploy, and debug",
  description: "Grounded developer guidance from official Liara documentation.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="font-sans">
      <body>{children}</body>
    </html>
  );
}
