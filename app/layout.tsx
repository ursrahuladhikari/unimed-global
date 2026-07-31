import React from "react";

export const metadata = {
  metadataBase: new URL("https://unimedg.com"),

  title: {
    default: "Unimed Global",
    template: "%s | Unimed Global",
  },

  description:
    "Study abroad consultancy helping students secure admissions in Russia, Uzbekistan, Europe and more.",

  keywords: [
    "Unimed Global",
    "Study Abroad",
    "MBBS Abroad",
    "Russia MBBS",
    "Uzbekistan MBBS",
  ],

  openGraph: {
    title: "Unimed Global",
    description: "Study Abroad Consultancy",
    url: "https://unimedg.com",
    siteName: "Unimed Global",
    images: ["/og-image.png"],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
