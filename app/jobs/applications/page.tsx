'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Calendar, 
  DollarSign, 
  Clock, 
  Eye, 
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';

interface JobApplication {
  id: string;
  job_id: string;
  message: string;
  budget: number | null;
  timeline: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
  updated_at: string;
  job: {
    id: string;
    title: string;
    description: string;
    pricing_type: 'hourly' | 'fixed' | 'package';
    base_price: number | null;
    hourly_rate: number | null;
    delivery_time: number | null;
    status: string;
    user: {
      id: string;
      full_name: string;
      avatar_url: string | null;
      role: string;
    };
    category: {
      id: string;
      name: string;
      icon: string;
    } | null;
  };
  package: {
    id: string;
    name: string;
    price: number;
    delivery_time: number;
    description: string;
  } | null;
}

export default function JobApplicationsPage() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          *,
          job:jobs(
            id,
            title,
            description,
            pricing_type,
            base_price,
            hourly_rate,
            delivery_time,
            status,
            user:profiles!jobs_user_id_fkey(id, full_name, avatar_url, role),
            category:job_categories(id, name, icon)
          ),
          package:job_packages(id, name, price, delivery_time, description)
        `)
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawApplication = async (applicationId: string) => {
    if (!confirm('Are you sure you want to withdraw this application?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('job_applications')
        .update({ status: 'withdrawn' })
        .eq('id', applicationId);

      if (error) throw error;

      setApplications(applications.map(app => 
        app.id === applicationId ? { ...app, status: 'withdrawn' as const } : app
      ));
      
      toast.success('Application withdrawn successfully');
    } catch (error) {
      console.error('Error withdrawing application:', error);
      toast.error('Failed to withdraw application');
    }
  };

  const filteredApplications = applications.filter(application => {
    const matchesSearch = 
      application.job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      application.job.user.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || application.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'withdrawn':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'accepted':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPriceDisplay = (application: JobApplication) => {
    if (application.package) {
      return `$${application.package.price} (${application.package.name})`;
    }
    
    if (application.job.pricing_type === 'hourly' && application.job.hourly_rate) {
      return `$${application.job.hourly_rate}/hr`;
    } else if (application.job.pricing_type === 'fixed' && application.job.base_price) {
      return `$${application.job.base_price}`;
    }
    
    return application.budget ? `$${application.budget} (Your Budget)` : 'Contact for pricing';
  };

  const getApplicationsByStatus = (status: string) => {
    return filteredApplications.filter(app => app.status === status);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                My Applications
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Track all your gig applications and their status
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Applications Content */}
        {filteredApplications.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <MessageSquare className="h-8 w-8 text-gray-400" />
                </div>
              </div>
              <CardTitle className="text-xl mb-2">No applications yet</CardTitle>
              <CardDescription className="mb-4">
                {searchTerm ? 'No applications match your search.' : 'You haven\'t applied to any gigs yet. Start browsing to find opportunities!'}
              </CardDescription>
              <Link href="/">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Browse Gigs
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All ({filteredApplications.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({getApplicationsByStatus('pending').length})</TabsTrigger>
              <TabsTrigger value="accepted">Accepted ({getApplicationsByStatus('accepted').length})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({getApplicationsByStatus('rejected').length})</TabsTrigger>
              <TabsTrigger value="withdrawn">Withdrawn ({getApplicationsByStatus('withdrawn').length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredApplications.map((application) => (
                  <ApplicationCard 
                    key={application.id} 
                    application={application}
                    onWithdraw={handleWithdrawApplication}
                    getStatusIcon={getStatusIcon}
                    getStatusColor={getStatusColor}
                    getPriceDisplay={getPriceDisplay}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="pending" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {getApplicationsByStatus('pending').map((application) => (
                  <ApplicationCard 
                    key={application.id} 
                    application={application}
                    onWithdraw={handleWithdrawApplication}
                    getStatusIcon={getStatusIcon}
                    getStatusColor={getStatusColor}
                    getPriceDisplay={getPriceDisplay}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="accepted" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {getApplicationsByStatus('accepted').map((application) => (
                  <ApplicationCard 
                    key={application.id} 
                    application={application}
                    onWithdraw={handleWithdrawApplication}
                    getStatusIcon={getStatusIcon}
                    getStatusColor={getStatusColor}
                    getPriceDisplay={getPriceDisplay}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="rejected" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {getApplicationsByStatus('rejected').map((application) => (
                  <ApplicationCard 
                    key={application.id} 
                    application={application}
                    onWithdraw={handleWithdrawApplication}
                    getStatusIcon={getStatusIcon}
                    getStatusColor={getStatusColor}
                    getPriceDisplay={getPriceDisplay}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="withdrawn" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {getApplicationsByStatus('withdrawn').map((application) => (
                  <ApplicationCard 
                    key={application.id} 
                    application={application}
                    onWithdraw={handleWithdrawApplication}
                    getStatusIcon={getStatusIcon}
                    getStatusColor={getStatusColor}
                    getPriceDisplay={getPriceDisplay}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

interface ApplicationCardProps {
  application: JobApplication;
  onWithdraw: (id: string) => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusColor: (status: string) => string;
  getPriceDisplay: (application: JobApplication) => string;
}

function ApplicationCard({ 
  application, 
  onWithdraw, 
  getStatusIcon, 
  getStatusColor, 
  getPriceDisplay 
}: ApplicationCardProps) {
  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <CardTitle className="text-lg line-clamp-2">
                <Link 
                  href={`/jobs/${application.job.id}`}
                  className="hover:text-blue-600 transition-colors"
                >
                  {application.job.title}
                </Link>
              </CardTitle>
            </div>
            <div className="flex items-center space-x-2 mb-2">
              <Badge className={getStatusColor(application.status)}>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(application.status)}
                  <span>{application.status.toUpperCase()}</span>
                </div>
              </Badge>
              {application.job.category && (
                <Badge variant="outline" className="text-xs">
                  {application.job.category.icon} {application.job.category.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Gig Owner */}
        <div className="flex items-center space-x-3 p-3 border rounded-lg">
          <Avatar className="h-8 w-8">
            <AvatarImage src={application.job.user.avatar_url || ''} />
            <AvatarFallback>
              {application.job.user.full_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{application.job.user.full_name}</p>
            <p className="text-xs text-gray-500 capitalize">{application.job.user.role}</p>
          </div>
        </div>

        {/* Application Message */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Your Message</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
            {application.message}
          </p>
        </div>

        {/* Pricing and Timeline */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="flex items-center space-x-1 text-gray-500 mb-1">
              <DollarSign className="h-4 w-4" />
              <span>Price</span>
            </div>
            <p className="font-medium">{getPriceDisplay(application)}</p>
          </div>
          {(application.timeline || application.job.delivery_time) && (
            <div>
              <div className="flex items-center space-x-1 text-gray-500 mb-1">
                <Clock className="h-4 w-4" />
                <span>Timeline</span>
              </div>
              <p className="font-medium">
                {application.timeline || `${application.job.delivery_time} days`}
              </p>
            </div>
          )}
        </div>

        {/* Application Date */}
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <Calendar className="h-3 w-3" />
          <span>Applied {format(new Date(application.created_at), 'MMM dd, yyyy')}</span>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-2 border-t">
          <Link href={`/jobs/${application.job.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              View Gig
            </Button>
          </Link>
          
          {application.status === 'pending' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onWithdraw(application.id)}
            >
              Withdraw
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}