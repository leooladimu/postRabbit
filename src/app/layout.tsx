import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "postRabbit — Create. Post. Grow.",
  description:
    "postRabbit generates optimized blog posts, meta descriptions, and Google Business updates tailored to your local market.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
