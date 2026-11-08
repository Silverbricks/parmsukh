import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/cart";

export const metadata: Metadata = {
  title: { default: "PARMSUKH – Ayurveda & Homoeopathy Centre", template: "%s · PARMSUKH" },
  description: "Traditional Wisdom. Holistic Wellbeing. Ayurveda & Homoeopathy consultations and wellness store – Bathinda, Punjab.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" />
      </head>
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
