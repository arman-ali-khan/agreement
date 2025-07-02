'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, FileText, MessageSquare, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { EnhancedContractChat } from './enhanced-contract-chat';
import { ContractProofs } from './contract-proofs';

type Contract = Database['public']['Tables']['contracts']['Row'] & {
  buyer?: Database['public']['Tables']['profiles']['Row'] | null;
  seller?: Database['public']['Tables']['profiles']['Row'] | null;
};

type ContractWithNames = Contract & {
  buyer_name: string;
  seller_name: string;
  buyer_email: string;
  seller_email: string;
};

interface ContractDetailsProps {
  contractId: string;
}

export function ContractDetails({ contractId }: ContractDetailsProps) {
  const [contract, setContract] = useState<ContractWithNames | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (contractId) {
      fetchContract();
    }
  }, [contractId]);

  const fetchContract = async () => {
    try {
      // First fetch the contract
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (contractError) throw contractError;

      if (!contractData) {
        setContract(null);
        return;
      }

      // Fetch buyer and seller profiles separately to avoid RLS issues
      const userIds = [contractData.buyer_id, contractData.seller_id];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role')
        .in('id', userIds);

      // Create a map of profiles for quick lookup
      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }

      const buyer = profilesMap.get(contractData.buyer_id);
      const seller = profilesMap.get(contractData.seller_id);

      const contractWithNames: ContractWithNames = {
        ...contractData,
        buyer,
        seller,
        buyer_name: buyer?.full_name || 'Unknown User',
        seller_name: seller?.full_name || 'Unknown User',
        buyer_email: buyer?.email || 'Unknown Email',
        seller_email: seller?.email || 'Unknown Email',
      };

      setContract(contractWithNames);
    } catch (error) {
      console.error('Error fetching contract:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
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
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">Contract not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userRole = user?.id === contract.buyer_id ? 'buyer' : 
                   user?.id === contract.seller_id ? 'seller' : 
                   profile?.role === 'admin' ? 'admin' : null;

  if (!userRole) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">Access denied</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 lg:flex items-start gap-4">
      {/* Contract Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{contract.title}</CardTitle>
              <CardDescription className="mt-2">{contract.description}</CardDescription>
              {profile?.role === 'admin' && (
                <div className="mt-2">
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                    Admin View
                  </Badge>
                </div>
              )}
            </div>
            <Badge className={getStatusColor(contract.status)}>
              {contract.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Buyer Info */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Buyer</h4>
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={contract.buyer?.avatar_url || ''} />
                  <AvatarFallback>{contract.buyer_name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{contract.buyer_name}</p>
                  <p className="text-sm text-gray-500">{contract.buyer_email}</p>
                  {contract.buyer?.role === 'admin' && (
                    <Badge className="text-xs bg-red-500 text-white">Admin</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Seller Info */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Seller</h4>
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={contract.seller?.avatar_url || ''} />
                  <AvatarFallback>{contract.seller_name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{contract.seller_name}</p>
                  <p className="text-sm text-gray-500">{contract.seller_email}</p>
                  {contract.seller?.role === 'admin' && (
                    <Badge className="text-xs bg-red-500 text-white">Admin</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Contract Info */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Contract Details</h4>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                  <span>Deadline: {format(new Date(contract.deadline), 'PPP')}</span>
                </div>
                <div className="flex items-center text-sm">
                  <FileText className="h-4 w-4 mr-2 text-gray-400" />
                  <span>Created: {format(new Date(contract.created_at), 'PPP')}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Your Role: </span>
                  <Badge variant="outline" className="capitalize">
                    {userRole}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="mt-6">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Terms & Conditions</h4>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{contract.terms}</p>
            </div>
          </div>

          {/* Attachment */}
          {contract.file_url && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Attachment</h4>
              <a
                href={contract.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Contract Attachment
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Chat and Proofs */}
      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Enhanced Real-time Chat</span>
          </TabsTrigger>
          <TabsTrigger value="proofs" className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Proofs {profile?.role === 'admin' ? '(Admin View)' : ''}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-6">
          <EnhancedContractChat contractId={contractId} />
        </TabsContent>

        <TabsContent value="proofs" className="mt-6">
          <ContractProofs contractId={contractId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}