import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WattHabit — Small habits. Real rewards.",
  description: "A student energy-habit and rewards preview. Build small habits, understand Swedish spot prices, and explore demo rewards.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
