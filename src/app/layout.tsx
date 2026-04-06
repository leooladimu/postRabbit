import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "postRabbit — Create. Post. Grow.",
  description:
    "postRabbit generates optimized blog posts, meta descriptions, and Google Business updates tailored to your local market.",
  openGraph: {
    title: "postRabbit — Create. Post. Grow.",
    description: "AI-Powered SEO Content for Local Businesses",
    images: ["https://postrabbit.oleo.dev/postRabbit.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "postRabbit — Create. Post. Grow.",
    description: "AI-Powered SEO Content for Local Businesses",
    images: ["https://postrabbit.oleo.dev/postRabbit.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/favicon2.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
