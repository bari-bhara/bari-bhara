import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const defaultUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? process.env.NEXT_PUBLIC_SITE_URL
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "Bari Bhara — Rental & property management",
    template: "%s · Bari Bhara",
  },
  description:
    "Manage properties, flats, tenants, rent, utility bills, maintenance and notices in one place.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1e9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0e0a" },
  ],
};

// One family for everything (ADR 0008): normal width for body text, the wide
// cut (`font-display`, wdth 125) for headings and key figures.
const archivo = Archivo({
  variable: "--font-sans",
  display: "swap",
  subsets: ["latin"],
  axes: ["wdth"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${archivo.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
