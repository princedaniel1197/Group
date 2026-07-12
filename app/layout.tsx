import type { Metadata } from "next";
import { Fraunces, Caveat, JetBrains_Mono } from "next/font/google";
import { IntroGate } from "@/components/IntroGate";
import "./globals.css";

// Display / headings — Fraunces (variable, optical sizing looks great large)
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

// Handwritten captions — Caveat
const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

// Mono date stamps / labels — JetBrains Mono
const jbmono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "keepsake",
  description: "A shared photo album for a small group of friends.",
  // Unlisted album — discourage indexing. Security is still the hard-to-guess URL.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${caveat.variable} ${jbmono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <IntroGate />
        {children}
      </body>
    </html>
  );
}
