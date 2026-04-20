import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mezza9.ph | Billiards Management",
  description: "Mezza9 Lounge reservation and admin control center.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
