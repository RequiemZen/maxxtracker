import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "MaxxTracker",
  description: "Track your daily schedule",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        {/* Glowing background orbs */}
        <div className="glowing-orb orb-1"></div>
        <div className="glowing-orb orb-2"></div>
        <div className="glowing-orb orb-3"></div>

        {children}
      </body>
    </html>
  );
}
