import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skroutz Picklist — Λίστα συλλογής",
  description: "Μετέτρεψε PDF παραγγελιών σε γρήγορη λίστα συλλογής.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="el">
      <body>{children}</body>
    </html>
  );
}
