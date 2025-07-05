'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  CalendarIcon, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  User,
  Upload,
  Loader2,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

type Contract = Database['public']['Tables']['contracts']['Row'] & {
  buyer: Database['public']['Tables']['profiles']['Row'];
  seller: Database['public']['Tables']['profiles']['Row'];
};

interface ContractCardProps {
  contract: Contract;
  onUpdate: () => void;
}

export function ContractCard({ contract, onUpdate }: ContractCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const { user, profile } = useAuth();

  const isUserInvolved = user && (contract.buyer_id === user.id || contract.seller_id === user.id);
  const userRole = user?.id === contract.buyer_id ? 'buyer' : 'seller';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'fulfilled': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'disputed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAccept = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      await supabase
        .from('contracts')
        .update({ status: 'active' })
        .eq('id', contract.id);

      await supabase.from('contract_events').insert({
        contract_id: contract.id,
        user_id: user.id,
        action_type: 'accepted',
        notes: `Contract accepted by ${profile?.full_name}`,
      });

      toast.success('Contract accepted!');
      onUpdate();
    } catch (error) {
      toast.error('Failed to accept contract');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      await supabase
        .from('contracts')
        .update({ status: 'cancelled' })
        .eq('id', contract.id);

      await supabase.from('contract_events').insert({
        contract_id: contract.id,
        user_id: user.id,
        action_type: 'declined',
        notes: `Contract declined by ${profile?.full_name}`,
      });

      toast.success('Contract declined');
      onUpdate();
    } catch (error) {
      toast.error('Failed to decline contract');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFulfill = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      await supabase
        .from('contracts')
        .update({ status: 'fulfilled' })
        .eq('id', contract.id);

      await supabase.from('contract_events').insert({
        contract_id: contract.id,
        user_id: user.id,
        action_type: 'fulfilled',
        notes: `Terms fulfilled by ${profile?.full_name}`,
      });

      toast.success('Contract marked as fulfilled!');
      onUpdate();
    } catch (error) {
      toast.error('Failed to fulfill contract');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      await supabase
        .from('contracts')
        .update({ status: 'completed' })
        .eq('id', contract.id);

      await supabase.from('contract_events').insert({
        contract_id: contract.id,
        user_id: user.id,
        action_type: 'completed',
        notes: `Contract completed by ${profile?.full_name}`,
      });

      toast.success('Contract completed!');
      onUpdate();
    } catch (error) {
      toast.error('Failed to complete contract');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingProof(true);
    try {
      const url = await uploadToCloudinary(file);
      
      await supabase.from('contract_events').insert({
        contract_id: contract.id,
        user_id: user.id,
        action_type: 'uploaded_proof',
        notes: `Proof of delivery uploaded by ${profile?.full_name}`,
        file_url: url,
      });

      toast.success('Proof uploaded successfully!');
      onUpdate();
    } catch (error) {
      toast.error('Failed to upload proof');
    } finally {
      setUploadingProof(false);
    }
  };

  const otherParty = userRole === 'buyer' ? contract.seller : contract.buyer;

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{contract.title}</CardTitle>
            <CardDescription className="mt-1">{contract.description}</CardDescription>
          </div>
          <Badge className={getStatusColor(contract.status)}>
            {contract.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-4 w-4" />
            <span>Deadline: {format(new Date(contract.deadline), 'PPP')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>You are the {userRole}</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 p-3 border rounded-lg">
          <Avatar className="h-8 w-8">
            <AvatarImage src={otherParty?.avatar_url || ''} />
            <AvatarFallback>{otherParty?.full_name?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{otherParty?.full_name}</p>
            <p className="text-xs text-gray-500">{otherParty?.role}</p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Terms & Conditions</h4>
          <div 
            className="text-sm border p-3 rounded-lg prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: contract.terms }}
          />
        </div>

        {contract.file_url && (
          <div className="flex items-center space-x-2 text-sm">
            <FileText className="h-4 w-4" />
            <a 
              href={contract.file_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View Attachment
            </a>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-4 border-t">
          {/* View Details Button */}
          <Link href={`/contracts/${contract.id}`}>
            <Button variant="outline" className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>View Details</span>
            </Button>
          </Link>

          {isUserInvolved && (
            <>
              {contract.status === 'pending' && (
                <>
                  <Button
                    onClick={handleAccept}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Accept
                  </Button>
                  <Button
                    onClick={handleDecline}
                    disabled={isLoading}
                    variant="destructive"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Decline
                  </Button>
                </>
              )}

              {contract.status === 'active' && userRole === 'seller' && (
                <Button
                  onClick={handleFulfill}
                  disabled={isLoading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Clock className="h-4 w-4 mr-2" />}
                  Mark as Fulfilled
                </Button>
              )}

              {contract.status === 'fulfilled' && userRole === 'buyer' && (
                <Button
                  onClick={handleComplete}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Complete Contract
                </Button>
              )}

              {(contract.status === 'active' || contract.status === 'fulfilled') && (
                <div className="flex items-center space-x-2">
                  <Label htmlFor={`proof-${contract.id}`} className="sr-only">Upload Proof</Label>
                  <Input
                    id={`proof-${contract.id}`}
                    type="file"
                    onChange={handleUploadProof}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="hidden"
                  />
                  <Button
                    onClick={() => document.getElementById(`proof-${contract.id}`)?.click()}
                    disabled={uploadingProof}
                    variant="outline"
                  >
                    {uploadingProof ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    Upload Proof
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}