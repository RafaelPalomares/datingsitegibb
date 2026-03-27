import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import NavBar from "@/components/NavBar";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

export const metadata: Metadata = {
  title: "muduo - Context-Based Dating",
  description: "Find meaningful matches through shared experiences."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body className="font-[var(--font-space-grotesk)]">
        <NavBar />
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </body>
    </html>
  );
}
