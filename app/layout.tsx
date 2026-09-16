import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "OSS Contributor Agent",
  description: "Cautious automated repository maintenance"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}