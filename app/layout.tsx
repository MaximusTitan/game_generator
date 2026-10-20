import type { Metadata } from "next";
import { Nunito, Patrick_Hand } from "next/font/google";
import "./globals.css";

const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });
const hand = Patrick_Hand({ variable: "--font-hand", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Game Gen: make learning games by describing them",
  description:
    "Pick a subject and Game Gen builds an educational quiz, answer race, sorting or memory game. No coding needed.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} ${hand.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
