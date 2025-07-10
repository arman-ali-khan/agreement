import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Check, 
  X, 
  MessageSquare, 
  DollarSign, 
  Clock, 
  Package,
  User,
  Calendar,
  Star
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ApplicationManagementProps {
  jobId: string;
}

export function ApplicationManagement({ jobId }: ApplicationManagementProps) {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [responding, setResponding] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (jobId) {
      fetchApplications();
    }
  }, [jobId]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          *,
          applicant:profiles!job_applications_applicant_id_fkey(*),
          package:job_packages(*)
        `)
        .eq('job_id', jobId)
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

  const handleApplicationResponse = async (applicationId: string, status: 'accepted' | 'rejected') => {
    if (!user) return;

    setResponding(true);
    try {
      // Update application status
      const { error: updateError } = await supabase
        .from('job_applications')
        .update({ status })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // Send message to applicant
      const application = applications.find(app => app.id === applicationId);
      if (application && responseMessage.trim()) {
        const messageContent = `Application ${status} for "${application.job?.title || 'your application'}"

${responseMessage.trim()}

${status === 'accepted' ? 
  'Congratulations! Your application has been accepted. We will be in touch soon to discuss next steps.' :
  'Thank you for your interest. While we won\'t be moving forward with your application at this time, we appreciate the time you took to apply.'
}`;

        await supabase
          .from('user_messages')
          .insert({
            sender_id: user.id,
            recipient_id: application.applicant_id,
            subject: `Application ${status}: ${application.job?.title || 'Your Application'}`,
            message: messageContent,
            message_type: 'gig_related',
            related_job_id: jobId
          });
      }

      // Update local state
      setApplications(applications.map(app => 
        app.id === applicationId ? { ...app, status } : app
      ));

      toast.success(`Application ${status} successfully`);
      setSelectedApplication(null);
      setResponseMessage('');
    } catch (error) {
      console.error('Error responding to application:', error);
      toast.error('Failed to respond to application');
    } finally {
      setResponding(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'accepted': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'withdrawn': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getApplicationsByStatus = (status: string) => {
    return applications.filter(app => app.status === status);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
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
        <CardTitle>Manage Applications</CardTitle>
        <CardDescription>
          Review and respond to applications for your gig
        </CardDescription>
      </CardHeader>
      <CardContent>
        {applications.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No applications yet</p>
          </div>
        ) : (
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending">
                Pending ({getApplicationsByStatus('pending').length})
              </TabsTrigger>
              <TabsTrigger value="accepted">
                Accepted ({getApplicationsByStatus('accepted').length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({getApplicationsByStatus('rejected').length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({applications.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-6">
              <ApplicationsList 
                applications={getApplicationsByStatus('pending')}
                onSelect={setSelectedApplication}
                onRespond={handleApplicationResponse}
                responding={responding}
                responseMessage={responseMessage}
                setResponseMessage={setResponseMessage}
              />
            </TabsContent>

            <TabsContent value="accepted" className="mt-6">
              <ApplicationsList 
                applications={getApplicationsByStatus('accepted')}
                onSelect={setSelectedApplication}
                readonly
              />
            </TabsContent>

            <TabsContent value="rejected" className="mt-6">
              <ApplicationsList 
                applications={getApplicationsByStatus('rejected')}
                onSelect={setSelectedApplication}
                readonly
              />
            </TabsContent>

            <TabsContent value="all" className="mt-6">
              <ApplicationsList 
                applications={applications}
                onSelect={setSelectedApplication}
                onRespond={handleApplicationResponse}
                responding={responding}
                responseMessage={responseMessage}
                setResponseMessage={setResponseMessage}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

interface ApplicationsListProps {
  applications: any[];
  onSelect: (application: any) => void;
  onRespond?: (applicationId: string, status: 'accepted' | 'rejected') => void;
  responding?: boolean;
  responseMessage?: string;
  setResponseMessage?: (message: string) => void;
  readonly?: boolean;
}

function ApplicationsList({ 
  applications, 
  onSelect, 
  onRespond, 
  responding, 
  responseMessage, 
  setResponseMessage,
  readonly = false 
}: ApplicationsListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'accepted': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'withdrawn': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (applications.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">No applications in this category</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {applications.map((application) => (
        <Card key={application.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={application.applicant?.avatar_url || ''} />
                  <AvatarFallback>
                    {application.applicant?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium">{application.applicant?.full_name}</h4>
                      <Badge className={getStatusColor(application.status)}>
                        {application.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {application.applicant?.email}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-medium">${application.budget}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span>{application.timeline}</span>
                    </div>
                    {application.package && (
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-purple-600" />
                        <span>{application.package.name}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-600" />
                      <span>{format(new Date(application.created_at), 'MMM dd')}</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-sm line-clamp-3">{application.message}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-2 ml-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onSelect(application)}
                    >
                      View Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Application Details</DialogTitle>
                      <DialogDescription>
                        Review this application and send a response
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                      {/* Applicant Info */}
                      <div className="flex items-center space-x-4 p-4 border rounded-lg">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={application.applicant?.avatar_url || ''} />
                          <AvatarFallback>
                            {application.applicant?.full_name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium text-lg">{application.applicant?.full_name}</h3>
                          <p className="text-gray-600 dark:text-gray-400">{application.applicant?.email}</p>
                          <Badge variant="outline" className="mt-1 capitalize">
                            {application.applicant?.role}
                          </Badge>
                        </div>
                      </div>

                      {/* Application Details */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="font-medium">Budget</Label>
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-medium">${application.budget}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="font-medium">Timeline</Label>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span>{application.timeline}</span>
                          </div>
                        </div>
                        {application.package && (
                          <>
                            <div className="space-y-2">
                              <Label className="font-medium">Selected Package</Label>
                              <div className="flex items-center space-x-2">
                                <Package className="h-4 w-4 text-purple-600" />
                                <span>{application.package.name}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="font-medium">Package Price</Label>
                              <span className="font-medium">${application.package.price}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Message */}
                      <div className="space-y-2">
                        <Label className="font-medium">Application Message</Label>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                          <p className="whitespace-pre-wrap">{application.message}</p>
                        </div>
                      </div>

                      {/* Response Section */}
                      {!readonly && application.status === 'pending' && onRespond && (
                        <div className="space-y-4 border-t pt-4">
                          <div>
                            <Label htmlFor="response">Your Response (Optional)</Label>
                            <Textarea
                              id="response"
                              value={responseMessage}
                              onChange={(e) => setResponseMessage?.(e.target.value)}
                              placeholder="Add a personal message to your response..."
                              rows={3}
                            />
                          </div>
                          
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => onRespond(application.id, 'rejected')}
                              disabled={responding}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                            <Button
                              onClick={() => onRespond(application.id, 'accepted')}
                              disabled={responding}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Accept
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Status Display for Non-Pending */}
                      {application.status !== 'pending' && (
                        <div className="border-t pt-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">Status:</span>
                            <Badge className={getStatusColor(application.status)}>
                              {application.status.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              on {format(new Date(application.updated_at), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                {!readonly && application.status === 'pending' && onRespond && (
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRespond(application.id, 'rejected')}
                      disabled={responding}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onRespond(application.id, 'accepted')}
                      disabled={responding}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}