import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yambol — Learn the market by doing",
  description: "A guided paper-trading classroom for the next generation of investors.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

