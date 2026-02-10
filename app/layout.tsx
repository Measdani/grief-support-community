import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/context/CartContext";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Holding Space Together - Find Support & Connection",
  description: "A compassionate community where people who have lost loved ones can find support, share experiences, and connect with others who understand.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          {children}
        </CartProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
