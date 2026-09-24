'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/components/ui/loading-state';
import '@scalar/api-reference-react/style.css';

// Dynamically import Scalar to avoid SSR issues with browser APIs
const ApiReferenceReact = dynamic(
  () => import('@scalar/api-reference-react').then((mod) => mod.ApiReferenceReact),
  { 
    ssr: false,
    loading: () => <LoadingState height="h-[80vh]" message="Loading API Documentation..." />
  }
);

export default function DocsPage() {
  // Extract backend base URL from NEXT_PUBLIC_API_URL (remove /api/v1) or fallback to Vercel backend
  const backendUrl = process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace('/api/v1', '')
    : 'https://sky-rate-backend.vercel.app';
  
  const openApiUrl = `${backendUrl}/openapi.json`;

  return (
    <div className="w-full min-h-[80vh] rounded-xl border border-border bg-background shadow-sm overflow-hidden flex flex-col">
      <ApiReferenceReact
        configuration={{
          spec: {
            url: openApiUrl,
          },
          theme: 'default',
          darkMode: true,
          metaData: {
            title: 'SkyRate API Docs'
          }
        }}
      />
    </div>
  );
}
