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
import { CalendarIcon, Upload, Loader2, FileText, Search } from 'lucide-react';
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
  const [buyerInfo, setBuyerInfo] = useState('');
  const [sellerInfo, setSellerInfo] = useState('');
  const [foundBuyer, setFoundBuyer] = useState<any>(null);
  const [foundSeller, setFoundSeller] = useState<any>(null);
  const [searchingBuyer, setSearchingBuyer] = useState(false);
  const [searchingSeller, setSearchingSeller] = useState(false);
  const { user, profile } = useAuth();
  const router = useRouter();

  const searchUser = async (searchTerm: string, type: 'buyer' | 'seller') => {
    if (!searchTerm.trim()) return null;

    const setSearching = type === 'buyer' ? setSearchingBuyer : setSearchingSeller;
    const setFound = type === 'buyer' ? setFoundBuyer : setFoundSeller;

    setSearching(true);
    try {
      // Search by email first
      let { data: userByEmail, error: emailError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, role')
        .eq('email', searchTerm.trim())
        .single();

      if (userByEmail && !emailError) {
        setFound(userByEmail);
        return userByEmail;
      }

      // If not found by email, try searching by phone
      let { data: userByPhone, error: phoneError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, role')
        .eq('phone', searchTerm.trim())
        .single();

      if (userByPhone && !phoneError) {
        setFound(userByPhone);
        return userByPhone;
      }

      // If still not found, try partial matches on email or full name
      let { data: usersByPartial, error: partialError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, role')
        .or(`email.ilike.%${searchTerm.trim()}%,full_name.ilike.%${searchTerm.trim()}%`)
        .limit(5);

      if (usersByPartial && usersByPartial.length > 0) {
        // For now, take the first match, but in a real app you might want to show a dropdown
        setFound(usersByPartial[0]);
        return usersByPartial[0];
      }

      setFound(null);
      return null;
    } catch (error) {
      console.error(`Error searching for ${type}:`, error);
      setFound(null);
      return null;
    } finally {
      setSearching(false);
    }
  };

  const handleBuyerSearch = async () => {
    await searchUser(buyerInfo, 'buyer');
  };

  const handleSellerSearch = async () => {
    await searchUser(sellerInfo, 'seller');
  };

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

    try {
      // Validate that we have found both users
      if (!foundBuyer) {
        throw new Error('Buyer not found. Please search for a valid buyer by email or phone.');
      }

      if (!foundSeller) {
        throw new Error('Seller not found. Please search for a valid seller by email or phone.');
      }

      // Validate that buyer and seller are different
      if (foundBuyer.id === foundSeller.id) {
        throw new Error('Buyer and seller cannot be the same person.');
      }

      console.log('Creating contract with:', {
        title,
        description,
        terms,
        buyer: foundBuyer,
        seller: foundSeller,
        deadline: deadline.toISOString(),
        fileUrl
      });

      // Create contract
      const { data, error } = await supabase
        .from('contracts')
        .insert({
          title,
          description,
          terms,
          buyer_id: foundBuyer.id,
          seller_id: foundSeller.id,
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
        notes: `Contract created by ${profile.full_name}`,
      });

      toast.success('Contract created successfully!');
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Contract creation error:', err);
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
                <Label htmlFor="buyerInfo">Buyer (Email or Phone) *</Label>
                <div className="flex space-x-2">
                  <Input
                    id="buyerInfo"
                    value={buyerInfo}
                    onChange={(e) => setBuyerInfo(e.target.value)}
                    placeholder="buyer@example.com or +1234567890"
                    className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBuyerSearch}
                    disabled={searchingBuyer || !buyerInfo.trim()}
                  >
                    {searchingBuyer ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {foundBuyer && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                    <p className="font-medium text-green-800">{foundBuyer.full_name}</p>
                    <p className="text-green-600">{foundBuyer.email}</p>
                    {foundBuyer.phone && (
                      <p className="text-green-600">{foundBuyer.phone}</p>
                    )}
                  </div>
                )}
                {buyerInfo && !foundBuyer && !searchingBuyer && (
                  <p className="text-sm text-red-600">User not found. Try searching by email or phone.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sellerInfo">Seller (Email or Phone) *</Label>
                <div className="flex space-x-2">
                  <Input
                    id="sellerInfo"
                    value={sellerInfo}
                    onChange={(e) => setSellerInfo(e.target.value)}
                    placeholder="seller@example.com or +1234567890"
                    className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSellerSearch}
                    disabled={searchingSeller || !sellerInfo.trim()}
                  >
                    {searchingSeller ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {foundSeller && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                    <p className="font-medium text-green-800">{foundSeller.full_name}</p>
                    <p className="text-green-600">{foundSeller.email}</p>
                    {foundSeller.phone && (
                      <p className="text-green-600">{foundSeller.phone}</p>
                    )}
                  </div>
                )}
                {sellerInfo && !foundSeller && !searchingSeller && (
                  <p className="text-sm text-red-600">User not found. Try searching by email or phone.</p>
                )}
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
              disabled={isLoading || !deadline || !foundBuyer || !foundSeller}
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

            <div className="text-sm text-gray-500">
              <p>* Required fields</p>
              <p>Note: Both buyer and seller must have accounts in the system. Search by email or phone number to find users.</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}