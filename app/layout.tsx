import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import RegisterSW from "./register-sw";
//import ChatWidget from "@/components/chat";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Piattaforma di Votazione - Patient Engagement Award",
  description: "Vota per le iniziative di engagement del paziente",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PEA Voting",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "PEA Voting",
    title: "Patient Engagement Award - Piattaforma di Votazione",
    description: "Vota per le iniziative di engagement del paziente",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <RegisterSW />
          {children}
          {/* <ChatWidget /> */}
        </ThemeProvider>
      </body>
    </html>
  );
}
