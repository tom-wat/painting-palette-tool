import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import React from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import ThemeScript from './theme-script';
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
    // The theme class is written by ThemeScript before hydration, so the
    // server-rendered <html> never matches — suppress the expected warning.
    <html
      lang="en"
      className={`h-full ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="h-full antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
