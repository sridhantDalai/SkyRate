import * as React from 'react';
import type { Metadata } from 'next';
import { Inter, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Preloader } from '@/components/ui/preloader';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"),
  title: {
    default: 'SkyRate – Real-Time Airfare Price Intelligence',
    template: '%s | SkyRate',
  },
  description:
    'Automated real-time airfare price indexing (APIx), state-wise MoSPI CPI benchmarking, and DGCA tariff surveillance dashboard (SIH26056).',
  keywords: [
    'airfare index', 'APIx', 'DGCA', 'MoSPI CPI',
    'aviation intelligence', 'airfare surveillance',
    'flight price monitoring', 'SIH26056', 'Fisher Ideal index',
  ],
  authors: [{ name: 'SkyRate Team (SIH26056)' }],
  creator: 'SkyRate',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: '/',
    title: 'SkyRate – Real-Time Airfare Price Intelligence',
    description:
      'Automated real-time airfare price indexing (APIx), state-wise MoSPI CPI benchmarking, and DGCA surveillance.',
    siteName: 'SkyRate',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang='en'
      className={`${inter.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className='min-h-full flex bg-background text-foreground font-sans'>
        <a href='#main-content' className='sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground'>
          Skip to content
        </a>
        <Preloader />
        <Sidebar />
        <div className='flex flex-1 flex-col min-w-0 min-h-screen'>
          <Header />
          <main id='main-content' className='flex-1 p-4 sm:p-6 lg:p-8 max-w-[88rem] w-full mx-auto'>
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
