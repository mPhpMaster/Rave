import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rave",
  description: "Watch videos together in sync."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
