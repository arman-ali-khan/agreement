'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Search, Trash2, Eye, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';

type Contract = Database['public']['Tables']['contracts']['Row'] & {
  buyer?: Database['public']['Tables']['profiles']['Row'] | null;
  seller?: Database['public']['Tables']['profiles']['Row'] | null;
};

type ContractWithProfiles = Contract & {
  buyer_name: string;
  seller_name: string;
  buyer_email: string;
  seller_email: string;
};

export function ContractsManagement() {
  const [contracts, setContracts] = useState<ContractWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      // First fetch contracts without profile joins to avoid RLS issues
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (contractsError) throw contractsError;

      if (!contractsData || contractsData.length === 0) {
        setContracts([]);
        return;
      }

      // Get unique user IDs
      const userIds = Array.from(new Set([
        ...contractsData.map(c => c.buyer_id),
        ...contractsData.map(c => c.seller_id)
      ]));

      // Fetch profiles using service role or admin privileges
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      // Create a map of profiles for quick lookup
      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }

      // Combine contracts with profile data
      const contractsWithProfiles: ContractWithProfiles[] = contractsData.map(contract => {
        const buyer = profilesMap.get(contract.buyer_id);
        const seller = profilesMap.get(contract.seller_id);
        
        return {
          ...contract,
          buyer,
          seller,
          buyer_name: buyer?.full_name || 'Unknown User',
          seller_name: seller?.full_name || 'Unknown User',
          buyer_email: buyer?.email || 'Unknown Email',
          seller_email: seller?.email || 'Unknown Email',
        };
      });

      setContracts(contractsWithProfiles);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateContractStatus = async (contractId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ status })
        .eq('id', contractId);

      if (error) throw error;
      
      setContracts(contracts.map(contract => 
        contract.id === contractId ? { ...contract, status } : contract
      ));
      
      toast.success('Contract status updated successfully');
    } catch (error) {
      console.error('Error updating contract:', error);
      toast.error('Failed to update contract');
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    if (!confirm('Are you sure you want to delete this contract? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId);

      if (error) throw error;
      
      setContracts(contracts.filter(contract => contract.id !== contractId));
      toast.success('Contract deleted successfully');
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast.error('Failed to delete contract');
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.buyer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.seller_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || contract.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'active': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'fulfilled': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'disputed': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contracts Management</CardTitle>
          <CardDescription>Loading contracts...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Contracts Management</CardTitle>
            <CardDescription>Manage all contracts and agreements</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search contracts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="fulfilled">Fulfilled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="disputed">Disputed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Contracts Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract</TableHead>
                <TableHead>Parties</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{contract.title}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {contract.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div><strong>Buyer:</strong> {contract.buyer_name}</div>
                      <div><strong>Seller:</strong> {contract.seller_name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(contract.status)}>
                      {contract.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(contract.deadline), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Link href={`/contracts/${contract.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          title="View contract details and chat"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteContract(contract.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Delete contract"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredContracts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No contracts found matching your criteria.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}