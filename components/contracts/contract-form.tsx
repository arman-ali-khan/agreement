'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, Upload, Loader2, FileText } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { toast } from 'sonner';

export function ContractForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<Date>();
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const { user, profile } = useAuth();
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setUploadingFile(true);

    try {
      const url = await uploadToCloudinary(selectedFile);
      setFileUrl(url);
      toast.success('File uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload file');
      setFile(null);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !profile || !deadline) return;

    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const terms = formData.get('terms') as string;
    const buyerEmail = formData.get('buyerEmail') as string;
    const sellerEmail = formData.get('sellerEmail') as string;

    try {
      // Find buyer and seller profiles
      const { data: buyerData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', buyerEmail);

      const { data: sellerData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', sellerEmail);

      const buyerProfile = buyerData?.[0];
      const sellerProfile = sellerData?.[0];

      if (!buyerProfile || !sellerProfile) {
        throw new Error('One or both parties not found. Please ensure both users have accounts.');
      }

      // Create contract
      const { data, error } = await supabase
        .from('contracts')
        .insert({
          title,
          description,
          terms,
          buyer_id: buyerProfile.id,
          seller_id: sellerProfile.id,
          deadline: deadline.toISOString(),
          file_url: fileUrl,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Create contract event
      await supabase.from('contract_events').insert({
        contract_id: data.id,
        user_id: user.id,
        action_type: 'created',
        notes: 'Contract created',
      });

      toast.success('Contract created successfully!');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to create contract');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Create New Contract
          </CardTitle>
          <CardDescription>
            Fill in the details to create a secure digital agreement
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Contract Title *</Label>
              <Input
                id="title"
                name="title"
                required
                placeholder="e.g., Website Development Agreement"
                className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                required
                placeholder="Describe what this contract is about..."
                className="min-h-24 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="buyerEmail">Buyer Email *</Label>
                <Input
                  id="buyerEmail"
                  name="buyerEmail"
                  type="email"
                  required
                  placeholder="buyer@example.com"
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellerEmail">Seller Email *</Label>
                <Input
                  id="sellerEmail"
                  name="sellerEmail"
                  type="email"
                  required
                  placeholder="seller@example.com"
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="terms">Terms & Conditions *</Label>
              <Textarea
                id="terms"
                name="terms"
                required
                placeholder="Specify the terms, deliverables, payment conditions, etc..."
                className="min-h-32 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label>Deadline *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal transition-all duration-200",
                      !deadline && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, "PPP") : "Pick a deadline"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={setDeadline}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Attachment (optional)</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
                {uploadingFile && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              {file && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <FileText className="h-4 w-4" />
                  <span>{file.name} uploaded successfully</span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
              disabled={isLoading || !deadline}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Contract...
                </>
              ) : (
                'Create Contract'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}