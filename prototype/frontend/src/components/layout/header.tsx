'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HealthIndicator } from './health-indicator';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/api';
import { Plane, Menu, X, ExternalLink } from 'lucide-react';
import { NAVIGATION_ITEMS } from '@/lib/constants';

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const currentNav = NAVIGATION_ITEMS.find(
    (n) => pathname === n.href || (n.href !== '/dashboard' && pathname?.startsWith(n.href))
  );
  const docsHref = API_BASE_URL.endsWith('/api/v1')
    ? `${API_BASE_URL.slice(0, -7)}/docs`
    : `${API_BASE_URL}/docs`;

  React.useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  return (
    <header className='sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/80 bg-background/80 px-4 sm:px-6 backdrop-blur-md'>
      <div className='flex items-center gap-3'>
        <Button
          variant='ghost'
          size='icon-sm'
          className='md:hidden'
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls='mobile-navigation'
        >
          {mobileMenuOpen ? <X className='h-5 w-5' /> : <Menu className='h-5 w-5' />}
        </Button>

        <div className='flex items-center gap-2 md:hidden'>
          <Plane className='h-5 w-5 text-primary transform -rotate-45' />
          <span className='font-bold text-sm'>SkyRate</span>
        </div>

        <div className='hidden sm:flex flex-col'>
          <h1 className='text-sm font-semibold text-foreground'>
            {currentNav?.name || 'Airfare Intelligence'}
          </h1>
          <p className='text-[11px] text-muted-foreground'>
            {currentNav?.description || 'FastAPI Microservice Interface'}
          </p>
        </div>
      </div>

      <div className='flex items-center gap-2.5'>
        <HealthIndicator />
        <a
          href={docsHref}
          target='_blank'
          rel='noreferrer'
          className='hidden sm:inline-flex'
        >
          <Button variant='outline' size='xs' className='gap-1 text-[11px]'>
            FastAPI Docs <ExternalLink className='h-3 w-3' />
          </Button>
        </a>
      </div>

      {mobileMenuOpen && (
        <nav id='mobile-navigation' aria-label='Primary navigation' className='absolute top-16 left-0 w-full border-b border-border bg-background p-4 shadow-lg md:hidden flex flex-col space-y-2 animate-in slide-in-from-top-2'>
          {NAVIGATION_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === item.href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
