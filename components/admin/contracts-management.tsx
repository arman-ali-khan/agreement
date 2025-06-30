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
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Search, Edit, Trash2, Eye, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

type Contract = Database['public']['Tables']['contracts']['Row'] & {
  buyer: Database['public']['Tables']['profiles']['Row'];
  seller: Database['public']['Tables']['profiles']['Row'];
};

export function ContractsManagement() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          buyer:profiles!contracts_buyer_id_fkey(*),
          seller:profiles!contracts_seller_id_fkey(*)
        `)
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
                         contract.buyer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contract.seller.full_name.toLowerCase().includes(searchTerm.toLowerCase());
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
                      <div><strong>Buyer:</strong> {contract.buyer.full_name}</div>
                      <div><strong>Seller:</strong> {contract.seller.full_name}</div>
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
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingContract(contract)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Contract Details</DialogTitle>
                            <DialogDescription>
                              View and manage contract information
                            </DialogDescription>
                          </DialogHeader>
                          {viewingContract && (
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium">Title</h4>
                                <p className="text-sm text-gray-600">{viewingContract.title}</p>
                              </div>
                              <div>
                                <h4 className="font-medium">Description</h4>
                                <p className="text-sm text-gray-600">{viewingContract.description}</p>
                              </div>
                              <div>
                                <h4 className="font-medium">Terms & Conditions</h4>
                                <p className="text-sm text-gray-600 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                                  {viewingContract.terms}
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium">Buyer</h4>
                                  <p className="text-sm text-gray-600">{viewingContract.buyer.full_name}</p>
                                  <p className="text-xs text-gray-500">{viewingContract.buyer.email}</p>
                                </div>
                                <div>
                                  <h4 className="font-medium">Seller</h4>
                                  <p className="text-sm text-gray-600">{viewingContract.seller.full_name}</p>
                                  <p className="text-xs text-gray-500">{viewingContract.seller.email}</p>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium">Status</h4>
                                <Select
                                  value={viewingContract.status}
                                  onValueChange={(value) => {
                                    handleUpdateContractStatus(viewingContract.id, value);
                                    setViewingContract({ ...viewingContract, status: value });
                                  }}
                                >
                                  <SelectTrigger className="w-48">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="fulfilled">Fulfilled</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                    <SelectItem value="disputed">Disputed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {viewingContract.file_url && (
                                <div>
                                  <h4 className="font-medium">Attachment</h4>
                                  <a 
                                    href={viewingContract.file_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-sm flex items-center"
                                  >
                                    <FileText className="h-4 w-4 mr-1" />
                                    View Attachment
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteContract(contract.id)}
                        className="text-red-600 hover:text-red-700"
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