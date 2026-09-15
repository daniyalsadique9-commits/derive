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
            // Every colour is fixed, so Clerk's light cards stay readable when the device is
            // in dark mode instead of mixing in dark-mode defaults.
            variables: {
              colorPrimary: "#d0161f",
              colorPrimaryForeground: "#ffffff",
              colorForeground: "#1f1e1b",
              colorMutedForeground: "#6b675e",
              colorMuted: "#f3f1ea",
              colorBackground: "#ffffff",
              colorInput: "#ffffff",
              colorInputForeground: "#1f1e1b",
              colorNeutral: "#1f1e1b",
              colorBorder: "#e5e0d4",
              colorRing: "#d0161f",
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
