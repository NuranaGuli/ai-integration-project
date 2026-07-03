import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Type-Safe Classroom Chat",
  description:
    "A type-safe classroom chat for language learners, built with TypeScript, Zod, and content safety filtering.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
