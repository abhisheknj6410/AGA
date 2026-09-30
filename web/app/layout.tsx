import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Graphical Investigation System",
  description: "Graph-first forensic reasoning, causal elimination, and adaptive algorithm engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className="antialiased bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 min-h-screen">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
