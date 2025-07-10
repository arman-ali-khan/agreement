'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/hooks/use-notifications';
import { supabase } from '@/lib/supabase';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Send,
  Paperclip,
  Briefcase,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function MessagesPage() {
  const { user, profile } = useAuth();
  const { messages, markMessageAsRead } = useNotifications();
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newMessageForm, setNewMessageForm] = useState({
    recipient_id: '',
    subject: '',
    message: '',
    message_type: 'normal'
  });
  const [users, setUsers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }
    
    fetchUsers();
    fetchUserJobs();
    fetchUserContracts();
  }, [user]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .neq('id', user?.id)
        .limit(50);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchUserJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchUserContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, title')
        .or(`buyer_id.eq.${user?.id},seller_id.eq.${user?.id}`)
        .in('status', ['active', 'fulfilled']);

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    }
  };

  const handleMessageClick = async (message: any) => {
    setSelectedMessage(message);
    if (!message.read) {
      await markMessageAsRead(message.id);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessageForm.recipient_id || !newMessageForm.message.trim()) {
      toast.error('Please select a recipient and enter a message');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('user_messages')
        .insert({
          sender_id: user?.id,
          recipient_id: newMessageForm.recipient_id,
          subject: newMessageForm.subject || null,
          message: newMessageForm.message,
          message_type: newMessageForm.message_type,
          related_job_id: newMessageForm.message_type === 'gig_related' ? newMessageForm.related_job_id : null,
          related_contract_id: newMessageForm.message_type === 'proof_message' ? newMessageForm.related_contract_id : null
        });

      if (error) throw error;

      toast.success('Message sent successfully!');
      setShowNewMessage(false);
      setNewMessageForm({
        recipient_id: '',
        subject: '',
        message: '',
        message_type: 'normal'
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const filteredMessages = messages.filter(message =>
    message.sender?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMessageTypeIcon = (messageType: string) => {
    switch (messageType) {
      case 'gig_related':
        return <Briefcase className="h-4 w-4 text-blue-600" />;
      case 'proof_message':
        return <FileText className="h-4 w-4 text-purple-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Messages
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your conversations and communications
            </p>
          </div>
          
          <Dialog open={showNewMessage} onOpenChange={setShowNewMessage}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Send New Message</DialogTitle>
                <DialogDescription>
                  Send a message to another user
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Recipient</label>
                  <Select 
                    value={newMessageForm.recipient_id} 
                    onValueChange={(value) => setNewMessageForm(prev => ({ ...prev, recipient_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Message Type</label>
                  <Select 
                    value={newMessageForm.message_type} 
                    onValueChange={(value) => setNewMessageForm(prev => ({ ...prev, message_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal Message</SelectItem>
                      <SelectItem value="gig_related">Gig Related</SelectItem>
                      <SelectItem value="proof_message">Proof Message</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Subject (Optional)</label>
                  <Input
                    value={newMessageForm.subject}
                    onChange={(e) => setNewMessageForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Message subject"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Message</label>
                  <Textarea
                    value={newMessageForm.message}
                    onChange={(e) => setNewMessageForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Type your message here..."
                    rows={4}
                  />
                </div>

                <Button 
                  onClick={handleSendMessage} 
                  disabled={sending}
                  className="w-full"
                >
                  {sending ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Conversations</CardTitle>
                  <Badge variant="secondary">{filteredMessages.length}</Badge>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-96">
                  {filteredMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <MessageSquare className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No messages found</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${
                            selectedMessage?.id === message.id ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                          } ${!message.read ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''}`}
                          onClick={() => handleMessageClick(message)}
                        >
                          <div className="flex items-start space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={message.sender?.avatar_url || ''} />
                              <AvatarFallback>
                                {message.sender?.full_name?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className={`text-sm ${!message.read ? 'font-medium' : ''}`}>
                                  {message.sender?.full_name || 'Unknown User'}
                                </p>
                                <div className="flex items-center space-x-1">
                                  {getMessageTypeIcon(message.message_type)}
                                  {!message.read && (
                                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                  )}
                                </div>
                              </div>
                              
                              {message.subject && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                  {message.subject}
                                </p>
                              )}
                              
                              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                {message.message}
                              </p>
                              
                              <p className="text-xs text-gray-500 mt-1">
                                {format(new Date(message.created_at), 'MMM dd, HH:mm')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Message Detail */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              {selectedMessage ? (
                <>
                  <CardHeader>
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={selectedMessage.sender?.avatar_url || ''} />
                        <AvatarFallback>
                          {selectedMessage.sender?.full_name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <CardTitle className="text-lg">
                            {selectedMessage.sender?.full_name || 'Unknown User'}
                          </CardTitle>
                          {getMessageTypeIcon(selectedMessage.message_type)}
                        </div>
                        
                        {selectedMessage.subject && (
                          <CardDescription className="font-medium">
                            {selectedMessage.subject}
                          </CardDescription>
                        )}
                        
                        <p className="text-sm text-gray-500">
                          {format(new Date(selectedMessage.created_at), 'MMMM dd, yyyy at HH:mm')}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <Separator />
                  
                  <CardContent className="p-6">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
                    </div>
                    
                    {selectedMessage.attachment_url && (
                      <div className="mt-4 p-3 border rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Paperclip className="h-4 w-4 text-gray-400" />
                          <a
                            href={selectedMessage.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            View Attachment
                          </a>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Select a message to view details</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}