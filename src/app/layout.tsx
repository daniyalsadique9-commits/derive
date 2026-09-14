import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { siteConfig } from "@/config/site";
import "katex/dist/katex.min.css";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the layout extend under the iPhone home indicator; padding keeps content clear of it.
  viewportFit: "cover",
  // Matches the page background so the mobile browser's toolbar blends in.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f5" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1b19" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full">
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#c2410c",
              colorForeground: "#1f1e1b",
              colorBackground: "#ffffff",
              fontFamily: "var(--font-inter)",
              borderRadius: "0.75rem",
            },
          }}
          localization={{
            signIn: { start: { title: `Sign in to ${siteConfig.name}` } },
            signUp: { start: { title: `Create your ${siteConfig.name} account` } },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
