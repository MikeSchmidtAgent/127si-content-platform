import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "127SI Content Platform",
  description: "127SI Tutorials, readings, and athlete Shout Outs.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
