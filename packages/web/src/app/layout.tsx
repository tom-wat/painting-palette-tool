import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import React from 'react';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'Painting Palette',
  description:
    'Extract optimized color palettes from reference images for painting',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${jetbrainsMono.variable}`}>
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
