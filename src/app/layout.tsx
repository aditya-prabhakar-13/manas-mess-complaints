import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manas Hostel Mess Complaint Portal",
  description:
    "Submit and review mess food complaints for Manas Hostel, managed by the Services Managing Committee (SMC).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="preload" href="/fonts/vt323.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
