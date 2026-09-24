import * as React from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://skyrate.aero'),
  title: {
    default: 'SkyRate - Airfare Intelligence & Analytics Dashboard',
    template: '%s | SkyRate',
  },
  description:
    'Automated real-time airfare price indexing (APIx), advance-purchase lead-time curves, and DGCA price surveillance dashboard (SIH26056).',
  keywords: [
    'airfare index',
    'APIx',
    'DGCA',
    'MoSPI CPI',
    'aviation intelligence',
    'airfare surveillance',
    'flight price monitoring',
    'SIH26056',
  ],
  authors: [{ name: 'SkyRate Team (SIH26056)' }],
  creator: 'SkyRate',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: '/',
    title: 'SkyRate - Airfare Intelligence & Analytics Dashboard',
    description:
      'Automated real-time airfare price indexing (APIx), advance-purchase lead-time curves, and DGCA surveillance dashboard.',
    siteName: 'SkyRate',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang='en'
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className='min-h-full flex bg-background text-foreground font-sans'>
        <Sidebar />
        <div className='flex flex-1 flex-col min-w-0 min-h-screen'>
          <Header />
          <main className='flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto'>
            <React.Suspense fallback={null}>
              {children}
            </React.Suspense>
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
