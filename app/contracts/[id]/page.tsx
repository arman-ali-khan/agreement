'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Navbar } from '@/components/layout/navbar';
import { ContractDetails } from '@/components/contracts/contract-details';
import { useRouter } from 'next/navigation';

interface ContractPageProps {
  params: {
    id: string;
  };
}

export default function ContractPage({ params }: ContractPageProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main>
        <ContractDetails contractId={params.id} />
      </main>
    </div>
  );
}