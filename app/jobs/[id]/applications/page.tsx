'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/layout/navbar';
import { ApplicationManagement } from '@/components/jobs/application-management';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ApplicationsPageProps {
  params: {
    id: string;
  };
}

export default function ApplicationsPage({ params }: ApplicationsPageProps) {
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (params.id && user) {
      fetchJob();
    }
  }, [params.id, user]);

  const fetchJob = async () => {
    try {
      setError(null);
      
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          category:job_categories(*),
          user:profiles(*)
        `)
        .eq('id', params.id)
        .single();

      if (jobError) throw jobError;

      if (!jobData) {
        setError('Job not found');
        return;
      }

      // Check if user owns this job
      if (jobData.user_id !== user?.id) {
        setError('You do not have permission to view applications for this job');
        return;
      }

      setJob(jobData);
    } catch (error: any) {
      console.error('Error fetching job:', error);
      setError(error.message || 'Failed to load job');
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-6xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-6xl mx-auto p-6">
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-red-500 mb-4">{error || 'Job not found'}</p>
              <Button onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Link href={`/jobs/${job.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Gig
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Applications for "{job.title}"
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Review and manage applications for your gig
            </p>
          </div>
        </div>

        {/* Job Summary */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Briefcase className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">{job.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {job.category?.name && (
                      <span className="inline-flex items-center">
                        {job.category.icon} {job.category.name}
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-green-600">
                  {job.pricing_type === 'hourly' && job.hourly_rate && `$${job.hourly_rate}/hr`}
                  {job.pricing_type === 'fixed' && job.base_price && `$${job.base_price}`}
                  {job.pricing_type === 'package' && 'Package deals'}
                </div>
                <div className="text-sm text-gray-500">
                  {job.delivery_time && `${job.delivery_time} day delivery`}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Applications Management */}
        <ApplicationManagement jobId={params.id} />
      </div>
    </div>
  );
}