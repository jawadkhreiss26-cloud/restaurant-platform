import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Iraq Restaurant Platform",
  description: "Internal admin — Iraqi restaurant website sales platform"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
