'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { JobFormData, JobCategory } from '@/lib/types/job';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Minus, 
  Upload, 
  Loader2, 
  FileText, 
  Eye,
  X,
  Star,
  Clock,
  DollarSign
} from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { toast } from 'sonner';

const RESPONSE_TIME_OPTIONS = [
  'within 1 hour',
  'within 2 hours',
  'within 6 hours',
  'within 12 hours',
  'within 24 hours',
  'within 2 days',
  'within 3 days'
];

const DAYS_OF_WEEK = [
  'monday',
  'tuesday', 
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

export function JobForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [currentTab, setCurrentTab] = useState('basic');
  const { user, profile } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    category_id: '',
    description: '',
    pricing_type: 'fixed',
    base_price: 0,
    hourly_rate: 0,
    delivery_time: 7,
    revisions_included: 2,
    requirements: '',
    terms_conditions: '',
    skills: [],
    portfolio_items: [],
    packages: [
      {
        name: 'Basic',
        description: '',
        price: 0,
        delivery_time: 7,
        revisions_included: 1,
        features: [],
        is_popular: false
      }
    ],
    availability_hours: {
      monday: { start: '09:00', end: '17:00', available: true },
      tuesday: { start: '09:00', end: '17:00', available: true },
      wednesday: { start: '09:00', end: '17:00', available: true },
      thursday: { start: '09:00', end: '17:00', available: true },
      friday: { start: '09:00', end: '17:00', available: true },
      saturday: { start: '09:00', end: '17:00', available: false },
      sunday: { start: '09:00', end: '17:00', available: false }
    },
    response_time: 'within 24 hours'
  });

  const [newSkill, setNewSkill] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('job_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const handleInputChange = (field: keyof JobFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const addPortfolioItem = () => {
    setFormData(prev => ({
      ...prev,
      portfolio_items: [
        ...prev.portfolio_items,
        {
          title: '',
          description: '',
          file_type: 'image'
        }
      ]
    }));
  };

  const updatePortfolioItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      portfolio_items: prev.portfolio_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removePortfolioItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      portfolio_items: prev.portfolio_items.filter((_, i) => i !== index)
    }));
  };

  const addPackage = () => {
    const packageNames = ['Standard', 'Premium', 'Enterprise'];
    const nextName = packageNames[formData.packages.length] || `Package ${formData.packages.length + 1}`;
    
    setFormData(prev => ({
      ...prev,
      packages: [
        ...prev.packages,
        {
          name: nextName,
          description: '',
          price: 0,
          delivery_time: 7,
          revisions_included: 1,
          features: [],
          is_popular: false
        }
      ]
    }));
  };

  const updatePackage = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      packages: prev.packages.map((pkg, i) => 
        i === index ? { ...pkg, [field]: value } : pkg
      )
    }));
  };

  const removePackage = (index: number) => {
    if (formData.packages.length > 1) {
      setFormData(prev => ({
        ...prev,
        packages: prev.packages.filter((_, i) => i !== index)
      }));
    }
  };

  const addPackageFeature = (packageIndex: number, feature: string) => {
    if (feature.trim()) {
      updatePackage(packageIndex, 'features', [
        ...formData.packages[packageIndex].features,
        feature.trim()
      ]);
    }
  };

  const removePackageFeature = (packageIndex: number, featureIndex: number) => {
    updatePackage(packageIndex, 'features', 
      formData.packages[packageIndex].features.filter((_, i) => i !== featureIndex)
    );
  };

  const handleFileUpload = async (file: File, portfolioIndex: number) => {
    setUploadingFile(true);
    try {
      const url = await uploadToCloudinary(file);
      updatePortfolioItem(portfolioIndex, 'image_url', url);
      toast.success('File uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!formData.title.trim()) errors.push('Title is required');
    if (formData.title.length > 80) errors.push('Title must be 80 characters or less');
    if (!formData.category_id) errors.push('Category is required');
    if (!formData.description.trim()) errors.push('Description is required');
    if (formData.description.length < 100) errors.push('Description must be at least 100 characters');
    
    if (formData.pricing_type === 'hourly' && (!formData.hourly_rate || formData.hourly_rate <= 0)) {
      errors.push('Hourly rate is required for hourly pricing');
    }
    if (formData.pricing_type === 'fixed' && (!formData.base_price || formData.base_price <= 0)) {
      errors.push('Base price is required for fixed pricing');
    }
    if (formData.pricing_type === 'package') {
      formData.packages.forEach((pkg, index) => {
        if (!pkg.name.trim()) errors.push(`Package ${index + 1} name is required`);
        if (!pkg.description.trim()) errors.push(`Package ${index + 1} description is required`);
        if (pkg.price <= 0) errors.push(`Package ${index + 1} price must be greater than 0`);
      });
    }
    
    if (formData.skills.length === 0) errors.push('At least one skill is required');
    if (!formData.terms_conditions.trim()) errors.push('Terms & conditions are required');
    
    return errors;
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!user) return;

    const errors = isDraft ? [] : validateForm();
    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create the job
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          title: formData.title,
          category_id: formData.category_id || null,
          description: formData.description,
          pricing_type: formData.pricing_type,
          base_price: formData.pricing_type === 'fixed' ? formData.base_price : null,
          hourly_rate: formData.pricing_type === 'hourly' ? formData.hourly_rate : null,
          delivery_time: formData.delivery_time,
          revisions_included: formData.revisions_included,
          requirements: formData.requirements,
          terms_conditions: formData.terms_conditions,
          availability_hours: formData.availability_hours,
          response_time: formData.response_time,
          status: isDraft ? 'draft' : 'active'
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // Add skills
      if (formData.skills.length > 0) {
        const skillsData = formData.skills.map(skill => ({
          job_id: job.id,
          skill_name: skill
        }));

        const { error: skillsError } = await supabase
          .from('job_skills')
          .insert(skillsData);

        if (skillsError) throw skillsError;
      }

      // Add portfolio items
      if (formData.portfolio_items.length > 0) {
        const portfolioData = formData.portfolio_items
          .filter(item => item.title.trim())
          .map((item, index) => ({
            job_id: job.id,
            title: item.title,
            description: item.description,
            image_url: item.image_url,
            file_url: item.file_url,
            file_type: item.file_type,
            order_index: index
          }));

        if (portfolioData.length > 0) {
          const { error: portfolioError } = await supabase
            .from('job_portfolio_items')
            .insert(portfolioData);

          if (portfolioError) throw portfolioError;
        }
      }

      // Add packages (if package pricing)
      if (formData.pricing_type === 'package' && formData.packages.length > 0) {
        const packagesData = formData.packages
          .filter(pkg => pkg.name.trim() && pkg.description.trim())
          .map((pkg, index) => ({
            job_id: job.id,
            name: pkg.name,
            description: pkg.description,
            price: pkg.price,
            delivery_time: pkg.delivery_time,
            revisions_included: pkg.revisions_included,
            features: pkg.features,
            is_popular: pkg.is_popular,
            order_index: index
          }));

        if (packagesData.length > 0) {
          const { error: packagesError } = await supabase
            .from('job_packages')
            .insert(packagesData);

          if (packagesError) throw packagesError;
        }
      }

      toast.success(isDraft ? 'Job saved as draft!' : 'Job created successfully!');
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Job creation error:', err);
      setError(err.message);
      toast.error('Failed to create job');
    } finally {
      setIsLoading(false);
    }
  };

  if (previewMode) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Preview Your Gig</h1>
          <Button onClick={() => setPreviewMode(false)} variant="outline">
            <X className="h-4 w-4 mr-2" />
            Close Preview
          </Button>
        </div>
        
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{formData.title}</CardTitle>
                <CardDescription className="mt-2">{formData.description}</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {formData.pricing_type === 'hourly' ? `$${formData.hourly_rate}/hr` :
                   formData.pricing_type === 'fixed' ? `$${formData.base_price}` :
                   'Package deals available'}
                </div>
                <div className="text-sm text-gray-500">
                  {formData.delivery_time} day delivery
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {formData.skills.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {formData.portfolio_items.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Portfolio</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {formData.portfolio_items.map((item, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="mt-6 flex space-x-4">
          <Button onClick={() => handleSubmit(true)} disabled={isLoading}>
            Save as Draft
          </Button>
          <Button onClick={() => handleSubmit(false)} disabled={isLoading}>
            Publish Gig
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Create New Gig
          </CardTitle>
          <CardDescription>
            Showcase your skills and attract clients with a compelling service offering
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Gig Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="I will create a stunning website for your business"
                  maxLength={80}
                  className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500">{formData.title.length}/80 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your service in detail. What will you deliver? What's your experience? What makes you unique?"
                  className="min-h-32 transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                  rows={6}
                />
                <p className="text-xs text-gray-500">{formData.description.length} characters (minimum 100)</p>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-6">
              <div className="space-y-4">
                <Label>Pricing Type *</Label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'fixed', label: 'Fixed Price', icon: DollarSign },
                    { value: 'hourly', label: 'Hourly Rate', icon: Clock },
                    { value: 'package', label: 'Packages', icon: Star }
                  ].map(({ value, label, icon: Icon }) => (
                    <Card 
                      key={value}
                      className={`cursor-pointer transition-all ${
                        formData.pricing_type === value 
                          ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => handleInputChange('pricing_type', value)}
                    >
                      <CardContent className="p-4 text-center">
                        <Icon className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                        <p className="font-medium">{label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {formData.pricing_type === 'fixed' && (
                <div className="space-y-2">
                  <Label htmlFor="base_price">Fixed Price *</Label>
                  <Input
                    id="base_price"
                    type="number"
                    value={formData.base_price}
                    onChange={(e) => handleInputChange('base_price', parseFloat(e.target.value) || 0)}
                    placeholder="500"
                    min="5"
                  />
                </div>
              )}

              {formData.pricing_type === 'hourly' && (
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">Hourly Rate *</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    value={formData.hourly_rate}
                    onChange={(e) => handleInputChange('hourly_rate', parseFloat(e.target.value) || 0)}
                    placeholder="50"
                    min="5"
                  />
                </div>
              )}

              {formData.pricing_type === 'package' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Service Packages</Label>
                    <Button onClick={addPackage} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Package
                    </Button>
                  </div>
                  
                  {formData.packages.map((pkg, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Input
                            value={pkg.name}
                            onChange={(e) => updatePackage(index, 'name', e.target.value)}
                            placeholder="Package name"
                            className="font-medium"
                          />
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={pkg.is_popular}
                              onCheckedChange={(checked) => updatePackage(index, 'is_popular', checked)}
                            />
                            <Label className="text-sm">Popular</Label>
                            {formData.packages.length > 1 && (
                              <Button
                                onClick={() => removePackage(index)}
                                variant="ghost"
                                size="sm"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <Textarea
                          value={pkg.description}
                          onChange={(e) => updatePackage(index, 'description', e.target.value)}
                          placeholder="Package description"
                          rows={2}
                        />
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Price ($)</Label>
                            <Input
                              type="number"
                              value={pkg.price}
                              onChange={(e) => updatePackage(index, 'price', parseFloat(e.target.value) || 0)}
                              min="5"
                            />
                          </div>
                          <div>
                            <Label>Delivery (days)</Label>
                            <Input
                              type="number"
                              value={pkg.delivery_time}
                              onChange={(e) => updatePackage(index, 'delivery_time', parseInt(e.target.value) || 1)}
                              min="1"
                            />
                          </div>
                          <div>
                            <Label>Revisions</Label>
                            <Input
                              type="number"
                              value={pkg.revisions_included}
                              onChange={(e) => updatePackage(index, 'revisions_included', parseInt(e.target.value) || 0)}
                              min="0"
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="delivery_time">Delivery Time (days)</Label>
                  <Input
                    id="delivery_time"
                    type="number"
                    value={formData.delivery_time}
                    onChange={(e) => handleInputChange('delivery_time', parseInt(e.target.value) || 1)}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="revisions">Revisions Included</Label>
                  <Input
                    id="revisions"
                    type="number"
                    value={formData.revisions_included}
                    onChange={(e) => handleInputChange('revisions_included', parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="skills" className="space-y-6">
              <div className="space-y-4">
                <Label>Skills & Expertise *</Label>
                <div className="flex space-x-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add a skill (e.g., React, Photoshop, SEO)"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  />
                  <Button onClick={addSkill} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {formData.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                        <span>{skill}</span>
                        <button onClick={() => removeSkill(skill)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements">Client Requirements</Label>
                <Textarea
                  id="requirements"
                  value={formData.requirements}
                  onChange={(e) => handleInputChange('requirements', e.target.value)}
                  placeholder="What do you need from the client to get started? (e.g., brand guidelines, content, access to accounts)"
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="portfolio" className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Portfolio Items</Label>
                  <Button onClick={addPortfolioItem} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
                
                {formData.portfolio_items.map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Input
                          value={item.title}
                          onChange={(e) => updatePortfolioItem(index, 'title', e.target.value)}
                          placeholder="Portfolio item title"
                        />
                        <Button
                          onClick={() => removePortfolioItem(index)}
                          variant="ghost"
                          size="sm"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Textarea
                        value={item.description}
                        onChange={(e) => updatePortfolioItem(index, 'description', e.target.value)}
                        placeholder="Describe this work sample"
                        rows={2}
                      />
                      
                      <div className="space-y-2">
                        <Label>Upload File</Label>
                        <Input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, index);
                          }}
                          accept="image/*,video/*,.pdf,.doc,.docx"
                          disabled={uploadingFile}
                        />
                        {uploadingFile && (
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Uploading...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="response_time">Response Time</Label>
                <Select value={formData.response_time} onValueChange={(value) => handleInputChange('response_time', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESPONSE_TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label>Availability Hours</Label>
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="flex items-center space-x-4">
                    <div className="w-20">
                      <Switch
                        checked={formData.availability_hours[day].available}
                        onCheckedChange={(checked) => 
                          handleInputChange('availability_hours', {
                            ...formData.availability_hours,
                            [day]: { ...formData.availability_hours[day], available: checked }
                          })
                        }
                      />
                    </div>
                    <div className="w-24 capitalize">{day}</div>
                    {formData.availability_hours[day].available && (
                      <>
                        <Input
                          type="time"
                          value={formData.availability_hours[day].start}
                          onChange={(e) => 
                            handleInputChange('availability_hours', {
                              ...formData.availability_hours,
                              [day]: { ...formData.availability_hours[day], start: e.target.value }
                            })
                          }
                          className="w-32"
                        />
                        <span>to</span>
                        <Input
                          type="time"
                          value={formData.availability_hours[day].end}
                          onChange={(e) => 
                            handleInputChange('availability_hours', {
                              ...formData.availability_hours,
                              [day]: { ...formData.availability_hours[day], end: e.target.value }
                            })
                          }
                          className="w-32"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="terms_conditions">Terms & Conditions *</Label>
                <Textarea
                  id="terms_conditions"
                  value={formData.terms_conditions}
                  onChange={(e) => handleInputChange('terms_conditions', e.target.value)}
                  placeholder="Define your service terms, refund policy, revision limits, etc."
                  rows={6}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between mt-8">
            <Button onClick={() => setPreviewMode(true)} variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            
            <div className="space-x-4">
              <Button
                onClick={() => handleSubmit(true)}
                disabled={isLoading}
                variant="outline"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save as Draft'
                )}
              </Button>
              <Button
                onClick={() => handleSubmit(false)}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  'Publish Gig'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}