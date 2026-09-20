'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAVIGATION_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Plane,
  TrendingUp,
  BarChart3,
  Compass,
  BookOpen,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className='h-4 w-4' />,
  Plane: <Plane className='h-4 w-4' />,
  TrendingUp: <TrendingUp className='h-4 w-4' />,
  BarChart3: <BarChart3 className='h-4 w-4' />,
  Compass: <Compass className='h-4 w-4' />,
  BookOpen: <BookOpen className='h-4 w-4' />,
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className='hidden md:flex w-64 flex-col border-r border-border/80 bg-sidebar/95 backdrop-blur-md shrink-0 h-screen sticky top-0'>
      {/* Brand Header */}
      <div className='flex h-16 items-center gap-2.5 border-b border-border/80 px-6'>
        <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow'>
          <Plane className='h-5 w-5 text-primary-foreground transform -rotate-45' />
        </div>
        <div className='flex flex-col'>
          <span className='font-bold text-base tracking-tight text-foreground'>
            SkyRate
          </span>
          <span className='text-[10px] font-semibold text-muted-foreground uppercase tracking-widest'>
            SIH26056 Analytics
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <div className='flex-1 overflow-y-auto px-3 py-4 space-y-1'>
        <div className='px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
          Aviation Intelligence
        </div>
        {NAVIGATION_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all group',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <div className='flex items-center gap-2.5'>
                <span className={cn(isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')}>
                  {ICON_MAP[item.icon] || <Layers className='h-4 w-4' />}
                </span>
                <span>{item.name}</span>
              </div>
              <ChevronRight
                className={cn(
                  'h-3.5 w-3.5 transition-transform',
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                )}
              />
            </Link>
          );
        })}
      </div>

      {/* Footer Info Box */}
      <div className='border-t border-border/80 p-4'>
        <div className='rounded-lg bg-muted/40 p-3 text-xs'>
          <div className='flex items-center gap-1.5 font-semibold text-foreground'>
            <Shield className='h-3.5 w-3.5 text-primary' />
            DGCA Surveillance
          </div>
          <p className='mt-1 text-[11px] text-muted-foreground leading-relaxed'>
            Independent domestic airfare indexing compliant with Ministry standards.
          </p>
        </div>
      </div>
    </aside>
  );
}
