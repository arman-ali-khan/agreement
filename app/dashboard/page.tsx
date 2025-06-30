'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import { Navbar } from '@/components/layout/navbar';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';
import { ContractCard } from '@/components/contracts/contract-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Contract = Database['public']['Tables']['contracts']['Row'] & {
  buyer: Database['public']['Tables']['profiles']['Row'];
  seller: Database['public']['Tables']['profiles']['Row'];
};

export default function DashboardPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchContracts();
    }
  }, [user]);

  const fetchContracts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          buyer:profiles!contracts_buyer_id_fkey(*),
          seller:profiles!contracts_seller_id_fkey(*)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter(contract =>
    contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getContractsByStatus = (status: string) => {
    return filteredContracts.filter(contract => contract.status === status);
  };

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
          
          {/* Stats */}
          <DashboardStats />
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
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
        </div>

        {/* Contracts */}
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
          ) : contracts.length === 0 ? (
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
      </main>
    </div>
  );
}