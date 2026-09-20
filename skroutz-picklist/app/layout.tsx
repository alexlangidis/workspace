import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skroutz Picklist — Λίστα συλλογής",
  description: "Μετέτρεψε PDF παραγγελιών σε γρήγορη λίστα συλλογής.",
};

export const viewport: Viewport = {
  themeColor: "#10201d",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="el">
      <body><PwaRegister />{children}</body>
    </html>
  );
}
