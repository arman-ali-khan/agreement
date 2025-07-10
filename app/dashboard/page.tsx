'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Navbar } from '@/components/layout/navbar';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';
import { JobDashboardStats } from '@/components/dashboard/job-dashboard-stats';
import { ContractsTab } from '@/components/dashboard/contracts-tab';
import { JobsTab } from '@/components/dashboard/jobs-tab';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('contracts');
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Welcome back, {profile.full_name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your contracts and agreements
              </p>
            </div>
            <Link href="/contracts/new">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200">
                <Plus className="h-4 w-4 mr-2" />
                Create Contract
              </Button>
            </Link>
          </div>
          
          {/* Tabs for different sections */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="contracts">Contracts</TabsTrigger>
              <TabsTrigger value="jobs">My Gigs</TabsTrigger>
            </TabsList>

            <TabsContent value="contracts" className="mt-6">
              <DashboardStats />
            </TabsContent>

            <TabsContent value="jobs" className="mt-6">
              <JobDashboardStats />
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="contracts" className="mt-6">
            <ContractsTab />
          </TabsContent>

          <TabsContent value="jobs" className="mt-6">
            <JobsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}