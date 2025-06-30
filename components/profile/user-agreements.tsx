'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Search, Edit, Trash2, Eye, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';

type Contract = Database['public']['Tables']['contracts']['Row'] & {
  buyer: Database['public']['Tables']['profiles']['Row'];
  seller: Database['public']['Tables']['profiles']['Row'];
};

export function UserAgreements() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserContracts();
    }
  }, [user]);

  const fetchUserContracts = async () => {
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
      toast.error('Failed to load agreements');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    if (!confirm('Are you sure you want to delete this agreement? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId);

      if (error) throw error;
      
      setContracts(contracts.filter(contract => contract.id !== contractId));
      toast.success('Agreement deleted successfully');
    } catch (error) {
      console.error('Error deleting contract:', error);
      toast.error('Failed to delete agreement');
    }
  };

  const filteredContracts = contracts.filter(contract =>
    contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <CardTitle>My Agreements</CardTitle>
          <CardDescription>Loading your agreements...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
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
            <CardTitle>My Agreements</CardTitle>
            <CardDescription>Manage all your contracts and agreements</CardDescription>
          </div>
          <Link href="/contracts/new">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              New Agreement
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search agreements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Agreements Table */}
        {filteredContracts.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agreement</TableHead>
                  <TableHead>Other Party</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => {
                  const isUserBuyer = user?.id === contract.buyer_id;
                  const otherParty = isUserBuyer ? contract.seller : contract.buyer;
                  
                  return (
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
                        <div>
                          <div className="font-medium">{otherParty.full_name}</div>
                          <div className="text-sm text-gray-500">
                            {isUserBuyer ? 'Seller' : 'Buyer'}
                          </div>
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
                                <DialogTitle>Agreement Details</DialogTitle>
                                <DialogDescription>
                                  View agreement information
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
                                    </div>
                                    <div>
                                      <h4 className="font-medium">Seller</h4>
                                      <p className="text-sm text-gray-600">{viewingContract.seller.full_name}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-medium">Status</h4>
                                    <Badge className={getStatusBadgeColor(viewingContract.status)}>
                                      {viewingContract.status.toUpperCase()}
                                    </Badge>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          {contract.status === 'draft' && (
                            <Link href={`/contracts/edit/${contract.id}`}>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                          
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                <Plus className="h-8 w-8 text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-medium mb-2">No agreements found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'No agreements match your search.' : 'You haven\'t created any agreements yet.'}
            </p>
            {!searchTerm && (
              <Link href="/contracts/new">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Agreement
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}