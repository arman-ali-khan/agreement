'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, FileText, MessageSquare, Upload, Info } from 'lucide-react';
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
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadProofs, setUnreadProofs] = useState(0);
  const [activeTab, setActiveTab] = useState('details');
  const { user, profile } = useAuth();

  useEffect(() => {
    if (contractId && user) {
      fetchContract();
      initializeUnreadCounts();
      setupRealtimeSubscriptions();
    }
  }, [contractId, user]);

  // Reset unread counts when switching tabs
  useEffect(() => {
    if (activeTab === 'chat' && unreadMessages > 0) {
      setUnreadMessages(0);
      updateLastViewedTimestamp('messages');
    } else if (activeTab === 'proofs' && unreadProofs > 0) {
      setUnreadProofs(0);
      updateLastViewedTimestamp('proofs');
    }
  }, [activeTab, unreadMessages, unreadProofs]);

  const getStorageKey = (type: 'messages' | 'proofs') => {
    return `lastViewed_${type}_${contractId}_${user?.id}`;
  };

  const updateLastViewedTimestamp = (type: 'messages' | 'proofs') => {
    if (!user) return;
    const timestamp = new Date().toISOString();
    localStorage.setItem(getStorageKey(type), timestamp);
  };

  const getLastViewedTimestamp = (type: 'messages' | 'proofs'): Date | null => {
    if (!user) return null;
    const timestamp = localStorage.getItem(getStorageKey(type));
    return timestamp ? new Date(timestamp) : null;
  };

  const initializeUnreadCounts = async () => {
    if (!user || !contractId) return;

    try {
      const lastMessageView = getLastViewedTimestamp('messages');
      const lastProofView = getLastViewedTimestamp('proofs');

      // Count unread messages
      let messageQuery = supabase
        .from('contract_messages')
        .select('id, created_at, user_id')
        .eq('contract_id', contractId)
        .neq('user_id', user.id);

      if (lastMessageView) {
        messageQuery = messageQuery.gt('created_at', lastMessageView.toISOString());
      }

      const { data: messagesData, error: messagesError } = await messageQuery;

      if (!messagesError && messagesData) {
        setUnreadMessages(messagesData.length);
      }

      // Count unread proofs
      let proofQuery = supabase
        .from('contract_proofs')
        .select('id, created_at, uploaded_by')
        .eq('contract_id', contractId)
        .neq('uploaded_by', user.id);

      if (lastProofView) {
        proofQuery = proofQuery.gt('created_at', lastProofView.toISOString());
      }

      const { data: proofsData, error: proofsError } = await proofQuery;

      if (!proofsError && proofsData) {
        setUnreadProofs(proofsData.length);
      }
    } catch (error) {
      console.error('Error initializing unread counts:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    if (!user || !contractId) return;

    const channel = supabase.channel(`contract-unread-${contractId}-${user.id}`, {
      config: {
        broadcast: { self: false },
      }
    });

    // Subscribe to new messages
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contract_messages',
          filter: `contract_id=eq.${contractId}`,
        },
        (payload) => {
          console.log('New message received:', payload);
          // Only count if it's not from the current user and not on chat tab
          if (payload.new.user_id !== user.id && activeTab !== 'chat') {
            setUnreadMessages(prev => prev + 1);
          }
        }
      )
      // Subscribe to new proofs
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contract_proofs',
          filter: `contract_id=eq.${contractId}`,
        },
        (payload) => {
          console.log('New proof received:', payload);
          // Only count if it's not from the current user and not on proofs tab
          if (payload.new.uploaded_by !== user.id && activeTab !== 'proofs') {
            setUnreadProofs(prev => prev + 1);
          }
        }
      )
      .subscribe((status) => {
        console.log('Unread subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Contract Header */}
     
      {/* Tabs for Details, Chat and Proofs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details" className="flex items-center space-x-2">
            <Info className="h-4 w-4" />
            <span>Contract Details</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center space-x-2 relative">
            <MessageSquare className="h-4 w-4" />
            <span>Enhanced Real-time Chat</span>
            {unreadMessages > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] z-10">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </div>
            )}
          </TabsTrigger>
          <TabsTrigger value="proofs" className="flex items-center space-x-2 relative">
            <Upload className="h-4 w-4" />
            <span>Proofs {profile?.role === 'admin' ? '(Admin View)' : ''}</span>
            {unreadProofs > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] z-10">
                {unreadProofs > 99 ? '99+' : unreadProofs}
              </div>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Complete Contract Information</CardTitle>
              <CardDescription>
                All details about this contract including parties, terms, and timeline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contract Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Contract Information</h5>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Title:</span> {contract.title}</div>
                      <div><span className="font-medium">Status:</span> 
                        <Badge className={`ml-2 ${getStatusColor(contract.status)}`}>
                          {contract.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div><span className="font-medium">Created:</span> {format(new Date(contract.created_at), 'PPP')}</div>
                      <div><span className="font-medium">Deadline:</span> {format(new Date(contract.deadline), 'PPP')}</div>
                      <div><span className="font-medium">Last Updated:</span> {format(new Date(contract.updated_at), 'PPP')}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Your Role</h5>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Role:</span> 
                        <Badge variant="outline" className="ml-2 capitalize">
                          {userRole}
                        </Badge>
                      </div>
                      {userRole === 'buyer' && (
                        <div><span className="font-medium">Counterparty:</span> {contract.seller_name} (Seller)</div>
                      )}
                      {userRole === 'seller' && (
                        <div><span className="font-medium">Counterparty:</span> {contract.buyer_name} (Buyer)</div>
                      )}
                      {userRole === 'admin' && (
                        <div className="text-red-600"><span className="font-medium">Admin Access:</span> Full contract oversight</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Parties Details */}
              <div>
                <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Contract Parties</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Buyer Details */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Buyer</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-3 mb-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={contract.buyer?.avatar_url || ''} />
                          <AvatarFallback>{contract.buyer_name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{contract.buyer_name}</p>
                          <p className="text-sm text-gray-500">{contract.buyer_email}</p>
                          {contract.buyer?.role === 'admin' && (
                            <Badge className="text-xs bg-red-500 text-white mt-1">Admin</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p><span className="font-medium">Role:</span> Contract Buyer</p>
                        <p><span className="font-medium">Responsibilities:</span> Review terms, make payments, confirm delivery</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Seller Details */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Seller</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-3 mb-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={contract.seller?.avatar_url || ''} />
                          <AvatarFallback>{contract.seller_name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{contract.seller_name}</p>
                          <p className="text-sm text-gray-500">{contract.seller_email}</p>
                          {contract.seller?.role === 'admin' && (
                            <Badge className="text-xs bg-red-500 text-white mt-1">Admin</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p><span className="font-medium">Role:</span> Contract Seller</p>
                        <p><span className="font-medium">Responsibilities:</span> Deliver goods/services, provide proof, fulfill terms</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Description */}
              <div>
                <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Description</h5>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm">{contract.description}</p>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div>
                <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Terms & Conditions</h5>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div 
                    className="text-sm prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: contract.terms }}
                  />
                </div>
              </div>

              {/* Attachment */}
              {contract.file_url && (
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Contract Attachment</h5>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <a
                      href={contract.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center"
                    >
                      <FileText className="h-5 w-5 mr-2" />
                      View Contract Attachment
                    </a>
                    <p className="text-xs text-gray-500 mt-1">
                      Click to view the attached contract document
                    </p>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Contract Timeline</h5>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="font-medium">Created:</span>
                    <span>{format(new Date(contract.created_at), 'PPP')}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="font-medium">Deadline:</span>
                    <span>{format(new Date(contract.deadline), 'PPP')}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="font-medium">Last Updated:</span>
                    <span>{format(new Date(contract.updated_at), 'PPP')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <EnhancedContractChat contractId={contractId} contract={contract} />
        </TabsContent>

        <TabsContent value="proofs" className="mt-6">
          <ContractProofs contractId={contractId} contract={contract} />
        </TabsContent>
      </Tabs>
    </div>
  );
}