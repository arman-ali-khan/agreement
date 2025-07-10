'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Job, JobSkill, JobPortfolioItem, JobPackage } from '@/lib/types/job';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Star, 
  Clock, 
  MessageSquare, 
  Edit, 
  Eye,
  Calendar,
  CheckCircle,
  DollarSign,
  User,
  MapPin,
  Globe,
  Phone,
  Mail
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface JobPageProps {
  params: {
    id: string;
  };
}

type FullJob = Job & {
  skills: JobSkill[];
  portfolio_items: JobPortfolioItem[];
  packages: JobPackage[];
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    phone: string | null;
    role: string;
    created_at: string;
  };
};

export default function JobPage({ params }: JobPageProps) {
  const [job, setJob] = useState<FullJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (params.id) {
      fetchJob();
    }
  }, [params.id]);

  const fetchJob = async () => {
    try {
      setError(null);
      
      // Fetch job with user data
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          category:job_categories(*),
          user:profiles(*)
        `)
        .eq('id', params.id)
        .single();

      if (jobError) throw jobError;

      if (!jobData) {
        setError('Job not found');
        return;
      }

      // Fetch skills
      const { data: skills, error: skillsError } = await supabase
        .from('job_skills')
        .select('*')
        .eq('job_id', params.id);

      if (skillsError) throw skillsError;

      // Fetch portfolio items
      const { data: portfolioItems, error: portfolioError } = await supabase
        .from('job_portfolio_items')
        .select('*')
        .eq('job_id', params.id)
        .order('order_index');

      if (portfolioError) throw portfolioError;

      // Fetch packages
      const { data: packages, error: packagesError } = await supabase
        .from('job_packages')
        .select('*')
        .eq('job_id', params.id)
        .order('order_index');

      if (packagesError) throw packagesError;

      setJob({
        ...jobData,
        skills: skills || [],
        portfolio_items: portfolioItems || [],
        packages: packages || [],
      });

    } catch (error: any) {
      console.error('Error fetching job:', error);
      setError(error.message || 'Failed to load job');
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPriceDisplay = () => {
    if (!job) return '';
    
    if (job.pricing_type === 'hourly' && job.hourly_rate) {
      return `$${job.hourly_rate}/hr`;
    } else if (job.pricing_type === 'fixed' && job.base_price) {
      return `$${job.base_price}`;
    } else if (job.pricing_type === 'package' && job.packages.length > 0) {
      const minPrice = Math.min(...job.packages.map(p => p.price));
      const maxPrice = Math.max(...job.packages.map(p => p.price));
      if (minPrice === maxPrice) {
        return `$${minPrice}`;
      }
      return `$${minPrice} - $${maxPrice}`;
    }
    return 'Contact for pricing';
  };

  const isOwner = user && job && user.id === job.user_id;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-6xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-6xl mx-auto p-6">
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">{error || 'Job not found'}</p>
              <Button onClick={() => router.push('/dashboard')} className="mt-4">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {job.title}
              </h1>
              <Badge className={getStatusColor(job.status)}>
                {job.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              {job.category?.name && (
                <span className="inline-flex items-center">
                  {job.category.icon} {job.category.name}
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {getPriceDisplay()}
              </div>
              <div className="text-sm text-gray-500">
                {job.delivery_time && `${job.delivery_time} day delivery`}
              </div>
            </div>
            {isOwner && (
              <Link href={`/jobs/${job.id}/edit`}>
                <Button>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Gig
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>About This Gig</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p className="whitespace-pre-wrap">{job.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            {job.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Skills & Expertise</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill.skill_name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Packages or Pricing Details */}
            {job.pricing_type === 'package' && job.packages.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Service Packages</CardTitle>
                  <CardDescription>Choose the package that best fits your needs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {job.packages.map((pkg) => (
                      <div key={pkg.id} className={`relative border rounded-lg p-4 ${pkg.is_popular ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-gray-200 dark:border-gray-700'}`}>
                        {pkg.is_popular && (
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                            <Badge className="bg-blue-500 text-white">Most Popular</Badge>
                          </div>
                        )}
                        <div className="text-center">
                          <h3 className="font-semibold text-lg">{pkg.name}</h3>
                          <div className="text-2xl font-bold text-green-600 my-2">
                            ${pkg.price}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            {pkg.description}
                          </p>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-center space-x-2">
                              <Clock className="h-4 w-4" />
                              <span>{pkg.delivery_time} day delivery</span>
                            </div>
                            <div className="flex items-center justify-center space-x-2">
                              <CheckCircle className="h-4 w-4" />
                              <span>{pkg.revisions_included} revision{pkg.revisions_included !== 1 ? 's' : ''}</span>
                            </div>
                          </div>

                          {pkg.features && Array.isArray(pkg.features) && pkg.features.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <div className="text-left">
                                <h4 className="font-medium mb-2">What's included:</h4>
                                <ul className="space-y-1">
                                  {pkg.features.map((feature, index) => (
                                    <li key={index} className="flex items-center space-x-2 text-sm">
                                      <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                                      <span>{feature}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}

                          {!isOwner && job.status === 'active' && (
                            <Button className="w-full mt-4">
                              Select Package
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <DollarSign className="h-8 w-8 mx-auto text-green-600 mb-2" />
                      <div className="font-semibold">Price</div>
                      <div className="text-sm text-gray-600">{getPriceDisplay()}</div>
                    </div>
                    {job.delivery_time && (
                      <div className="text-center">
                        <Clock className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                        <div className="font-semibold">Delivery</div>
                        <div className="text-sm text-gray-600">{job.delivery_time} days</div>
                      </div>
                    )}
                    <div className="text-center">
                      <CheckCircle className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                      <div className="font-semibold">Revisions</div>
                      <div className="text-sm text-gray-600">{job.revisions_included}</div>
                    </div>
                    {job.response_time && (
                      <div className="text-center">
                        <MessageSquare className="h-8 w-8 mx-auto text-orange-600 mb-2" />
                        <div className="font-semibold">Response</div>
                        <div className="text-sm text-gray-600">{job.response_time}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Portfolio */}
            {job.portfolio_items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio & Examples</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {job.portfolio_items.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        {item.image_url && (
                          <div className="mb-3">
                            <img 
                              src={item.image_url} 
                              alt={item.title}
                              className="w-full h-40 object-cover rounded-lg"
                            />
                          </div>
                        )}
                        <h4 className="font-medium">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {item.description}
                          </p>
                        )}
                        {item.file_url && (
                          <a 
                            href={item.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                          >
                            View File
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Requirements */}
            {job.requirements && (
              <Card>
                <CardHeader>
                  <CardTitle>Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="whitespace-pre-wrap">{job.requirements}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Terms & Conditions */}
            {job.terms_conditions && (
              <Card>
                <CardHeader>
                  <CardTitle>Terms & Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="whitespace-pre-wrap">{job.terms_conditions}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Seller Info */}
            <Card>
              <CardHeader>
                <CardTitle>About the Seller</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={job.user.avatar_url || ''} />
                    <AvatarFallback>
                      {job.user.full_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{job.user.full_name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {job.user.role}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Member since</span>
                    <span>{format(new Date(job.user.created_at), 'MMM yyyy')}</span>
                  </div>
                  
                  {job.user.email && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">{job.user.email}</span>
                    </div>
                  )}
                  
                  {job.user.phone && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">{job.user.phone}</span>
                    </div>
                  )}
                </div>

                {!isOwner && job.status === 'active' && (
                  <div className="mt-4 pt-4 border-t">
                    <Button className="w-full">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Contact Seller
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Gig Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Rating</span>
                    </div>
                    <span className="font-medium">
                      {job.rating > 0 ? `${job.rating}/5` : 'No ratings yet'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Views</span>
                    </div>
                    <span className="font-medium">{job.views_count}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Applications</span>
                    </div>
                    <span className="font-medium">{job.applications_count}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">Created</span>
                    </div>
                    <span className="font-medium text-sm">
                      {format(new Date(job.created_at), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Availability */}
            {job.availability_hours && (
              <Card>
                <CardHeader>
                  <CardTitle>Availability</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(job.availability_hours).map(([day, hours]: [string, any]) => (
                      <div key={day} className="flex justify-between items-center text-sm">
                        <span className="capitalize font-medium">{day}</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {hours.available ? `${hours.start} - ${hours.end}` : 'Unavailable'}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {job.response_time && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium">Response time</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {job.response_time}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}