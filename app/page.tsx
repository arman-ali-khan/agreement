'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { GigsHomePage } from '@/components/home/gigs-home-page';
import { LandingPage } from '@/components/landing/landing-page';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show gigs marketplace for both authenticated and non-authenticated users
  if (user) {
    return <GigsHomePage />;
  }

  // Show landing page for non-authenticated users
  return <LandingPage />;
}