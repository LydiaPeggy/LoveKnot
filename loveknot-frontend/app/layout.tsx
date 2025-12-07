import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "LoveKnot - The Secret Crush Verifier",
  description: "Only mutual feelings trigger the notification. Discover if your crush feels the same way with FHE encryption.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 dark:from-purple-950 dark:via-purple-900 dark:to-purple-950">
            <Navbar />
            <main className="container mx-auto px-4 py-8 md:py-12">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
