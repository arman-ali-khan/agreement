'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Upload, FileText, Check, X, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { uploadToCloudinary } from '@/lib/cloudinary';

type Proof = Database['public']['Tables']['contract_proofs']['Row'] & {
  uploaded_by_profile: Database['public']['Tables']['profiles']['Row'];
  reviewed_by_profile?: Database['public']['Tables']['profiles']['Row'];
};

interface ContractProofsProps {
  contractId: string;
}

export function ContractProofs({ contractId }: ContractProofsProps) {
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const { user, profile } = useAuth();

  const [uploadForm, setUploadForm] = useState({
    proofType: '',
    description: '',
    file: null as File | null,
  });

  useEffect(() => {
    if (contractId) {
      fetchProofs();
    }
  }, [contractId]);

  const fetchProofs = async () => {
    try {
      const { data, error } = await supabase
        .from('contract_proofs')
        .select(`
          *,
          uploaded_by_profile:profiles!contract_proofs_uploaded_by_fkey(*),
          reviewed_by_profile:profiles!contract_proofs_reviewed_by_fkey(*)
        `)
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProofs(data || []);
    } catch (error) {
      console.error('Error fetching proofs:', error);
      toast.error('Failed to load proofs');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadProof = async () => {
    if (!uploadForm.file || !uploadForm.proofType || !user) return;

    setUploading(true);
    try {
      const fileUrl = await uploadToCloudinary(uploadForm.file);
      
      const { error } = await supabase
        .from('contract_proofs')
        .insert({
          contract_id: contractId,
          uploaded_by: user.id,
          proof_type: uploadForm.proofType,
          file_url: fileUrl,
          file_name: uploadForm.file.name,
          description: uploadForm.description,
        });

      if (error) throw error;
      
      toast.success('Proof uploaded successfully');
      setShowUploadDialog(false);
      setUploadForm({ proofType: '', description: '', file: null });
      fetchProofs();
    } catch (error) {
      console.error('Error uploading proof:', error);
      toast.error('Failed to upload proof');
    } finally {
      setUploading(false);
    }
  };

  const handleReviewProof = async (proofId: string, status: 'approved' | 'rejected') => {
    if (!user || profile?.role !== 'admin') return;

    try {
      const { error } = await supabase
        .from('contract_proofs')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', proofId);

      if (error) throw error;
      
      toast.success(`Proof ${status} successfully`);
      fetchProofs();
    } catch (error) {
      console.error('Error reviewing proof:', error);
      toast.error('Failed to review proof');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getProofTypeLabel = (type: string) => {
    switch (type) {
      case 'delivery': return 'Delivery Proof';
      case 'payment': return 'Payment Proof';
      case 'completion': return 'Completion Proof';
      case 'other': return 'Other';
      default: return type;
    }
  };

  const canUploadProofs = user && profile && (
    profile.role === 'admin' || 
    // Check if user is part of the contract (this would need contract data)
    true // For now, allow all authenticated users
  );

  const isAdmin = profile?.role === 'admin';

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contract Proofs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
            <CardTitle>Contract Proofs</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {isAdmin ? 'View and review all proof submissions' : 'Upload and view proof documents'}
            </p>
          </div>
          {canUploadProofs && (
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Proof
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Proof</DialogTitle>
                  <DialogDescription>
                    Upload proof documents for this contract
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="proofType">Proof Type</Label>
                    <Select
                      value={uploadForm.proofType}
                      onValueChange={(value) => setUploadForm(prev => ({ ...prev, proofType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select proof type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="delivery">Delivery Proof</SelectItem>
                        <SelectItem value="payment">Payment Proof</SelectItem>
                        <SelectItem value="completion">Completion Proof</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe this proof..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="file">File</Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={(e) => setUploadForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                  </div>
                  
                  <Button
                    onClick={handleUploadProof}
                    disabled={uploading || !uploadForm.file || !uploadForm.proofType}
                    className="w-full"
                  >
                    {uploading ? 'Uploading...' : 'Upload Proof'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {proofs.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No proofs uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {proofs.map((proof) => (
              <div key={proof.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{getProofTypeLabel(proof.proof_type)}</h4>
                    <p className="text-sm text-gray-500">
                      Uploaded by {proof.uploaded_by_profile.full_name}
                      {proof.uploaded_by_profile.role === 'admin' && (
                        <span className="ml-1 text-xs bg-red-500 text-white px-1 rounded">Admin</span>
                      )}
                    </p>
                  </div>
                  <Badge className={getStatusBadgeColor(proof.status)}>
                    {proof.status.toUpperCase()}
                  </Badge>
                </div>
                
                {proof.description && (
                  <p className="text-sm text-gray-600 mb-2">{proof.description}</p>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <a
                      href={proof.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {proof.file_name}
                    </a>
                  </div>
                  
                  {isAdmin && proof.status === 'pending' && (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewProof(proof.id, 'approved')}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewProof(proof.id, 'rejected')}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 mt-2">
                  Uploaded {format(new Date(proof.created_at), 'PPp')}
                  {proof.reviewed_at && proof.reviewed_by_profile && (
                    <span className="ml-2">
                      • Reviewed by {proof.reviewed_by_profile.full_name} on {format(new Date(proof.reviewed_at), 'PPp')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}