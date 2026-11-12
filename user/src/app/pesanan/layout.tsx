import type { Metadata } from "next";

export const metadata: Metadata = { title: "Struk belanja" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
