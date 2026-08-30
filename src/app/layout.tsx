import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { strings } from "@/lib/constants/strings";

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-lato",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: strings.app.name,
    template: `%s · ${strings.app.shortName}`,
  },
  description: strings.app.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={lato.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
