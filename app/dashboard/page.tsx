'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import { Navbar } from '@/components/layout/navbar';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';
import { ContractCard } from '@/components/contracts/contract-card';
import { Button } from '@/components/ui/button';
import { JobDashboardStats } from '@/components/dashboard/job-dashboard-stats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { JobCard } from '@/components/jobs/job-card';

type Contract = Database['public']['Tables']['contracts']['Row'] & {
  buyer: Database['public']['Tables']['profiles']['Row'];
  seller: Database['public']['Tables']['profiles']['Row'];
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('contracts');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  // Fetch jobs when switching to jobs tab
  useEffect(() => {
    if (activeTab === 'jobs' && user) {
      fetchJobs();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && profile) {
      fetchContracts();
    }
  }, [user, profile]);

  const fetchContracts = async () => {
    if (!user) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      console.log('Fetching contracts for user:', user.id);

      // First, let's test the basic connection
      const { data: testData, error: testError } = await supabase
        .from('contracts')
        .select('id')
        .limit(1);

      if (testError) {
        console.error('Database connection test failed:', testError);
        throw new Error(`Database connection failed: ${testError.message}`);
      }

      console.log('Database connection successful');

      // Now fetch contracts with profile data
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          buyer:profiles!contracts_buyer_id_fkey(*),
          seller:profiles!contracts_seller_id_fkey(*)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contracts:', error);
        throw new Error(`Failed to fetch contracts: ${error.message}`);
      }

      console.log('Contracts fetched successfully:', data?.length || 0);
      setContracts(data || []);
    } catch (error: any) {
      console.error('Error in fetchContracts:', error);
      setError(error.message || 'Failed to load contracts');
      toast.error(error.message || 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    if (!user) {
      setJobsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          category:job_categories(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setJobsLoading(false);
    }
  };

  const handleJobStatusChange = async (jobId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status })
        .eq('id', jobId);

      if (error) throw error;
      
      await fetchJobs();
      toast.success('Job status updated successfully');
    } catch (error) {
      console.error('Error updating job status:', error);
      toast.error('Failed to update job status');
    }
  };

  const filteredContracts = contracts.filter(contract =>
    contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getContractsByStatus = (status: string) => {
    return filteredContracts.filter(contract => contract.status === status);
  };

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <div className="text-red-600 dark:text-red-400">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Error loading contracts
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {error}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={fetchContracts} 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900"
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6">
          <TabsContent value="contracts">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search contracts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="jobs">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search gigs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </TabsContent>
        </div>

        {/* Contracts */}
        <TabsContent value="contracts">
          <div className="space-y-6">
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : contracts.length === 0 && !error ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                      <Plus className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>
                  <CardTitle className="text-xl mb-2">No contracts yet</CardTitle>
                  <CardDescription className="mb-4">
                    Create your first contract to get started with secure digital agreements.
                  </CardDescription>
                  <Link href="/contracts/new">
                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Contract
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all">All ({filteredContracts.length})</TabsTrigger>
                  <TabsTrigger value="pending">Pending ({getContractsByStatus('pending').length})</TabsTrigger>
                  <TabsTrigger value="active">Active ({getContractsByStatus('active').length})</TabsTrigger>
                  <TabsTrigger value="fulfilled">Fulfilled ({getContractsByStatus('fulfilled').length})</TabsTrigger>
                  <TabsTrigger value="completed">Completed ({getContractsByStatus('completed').length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredContracts.map((contract) => (
                      <ContractCard
                        key={contract.id}
                        contract={contract}
                        onUpdate={fetchContracts}
                      />
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="pending" className="mt-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {getContractsByStatus('pending').map((contract) => (
                      <ContractCard
                        key={contract.id}
                        contract={contract}
                        onUpdate={fetchContracts}
                      />
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="active" className="mt-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {getContractsByStatus('active').map((contract) => (
                      <ContractCard
                        key={contract.id}
                        contract={contract}
                        onUpdate={fetchContracts}
                      />
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="fulfilled" className="mt-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {getContractsByStatus('fulfilled').map((contract) => (
                      <ContractCard
                        key={contract.id}
                        contract={contract}
                        onUpdate={fetchContracts}
                      />
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="completed" className="mt-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {getContractsByStatus('completed').map((contract) => (
                      <ContractCard
                        key={contract.id}
                        contract={contract}
                        onUpdate={fetchContracts}
                      />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </TabsContent>

        {/* Jobs */}
        <TabsContent value="jobs">
          <div className="space-y-6">
            {jobsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                      <Plus className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>
                  <CardTitle className="text-xl mb-2">No gigs yet</CardTitle>
                  <CardDescription className="mb-4">
                    Create your first gig to start offering your services.
                  </CardDescription>
                  <Link href="/jobs/new">
                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Gig
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onStatusChange={handleJobStatusChange}
                    onDelete={async (jobId) => {
                      try {
                        const { error } = await supabase
                          .from('jobs')
                          .delete()
                          .eq('id', jobId);

                        if (error) throw error;
                        
                        await fetchJobs();
                        toast.success('Job deleted successfully');
                      } catch (error) {
                        console.error('Error deleting job:', error);
                        toast.error('Failed to delete job');
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}