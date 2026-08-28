import type { Metadata } from "next";
import { Sora } from "next/font/google";
import { PrivyProvider } from "@/components/PrivyProvider";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: "VeilCast",
  description: "Private prediction markets with verifiable sports outcomes",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={sora.variable}>
      <body className="antialiased" style={{ fontFamily: "var(--font-sora), sans-serif" }}>
        <PrivyProvider>
          <AppShell>{children}</AppShell>
        </PrivyProvider>
      </body>
    </html>
  );
}
