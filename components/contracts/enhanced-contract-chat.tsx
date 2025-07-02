'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  File, 
  Smile,
  Reply,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { uploadToCloudinary } from '@/lib/cloudinary';

type Message = Database['public']['Tables']['contract_messages']['Row'] & {
  user: Database['public']['Tables']['profiles']['Row'];
  reactions?: Array<{
    id: string;
    reaction: string;
    user_id: string;
    user: Database['public']['Tables']['profiles']['Row'];
  }>;
  reply_to?: Database['public']['Tables']['contract_messages']['Row'] & {
    user: Database['public']['Tables']['profiles']['Row'];
  };
};

type AdminSession = Database['public']['Tables']['admin_chat_sessions']['Row'] & {
  admin: Database['public']['Tables']['profiles']['Row'];
};

interface EnhancedContractChatProps {
  contractId: string;
}

const REACTIONS = ['👍', '👎', '❤️', '😊', '😢', '😮', '😡'];

export function EnhancedContractChat({ contractId }: EnhancedContractChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [adminSessions, setAdminSessions] = useState<AdminSession[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const { user, profile } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (contractId && user) {
      console.log('Setting up chat for contract:', contractId, 'user:', user.id);
      fetchMessages();
      fetchAdminSessions();
      
      // Set up real-time subscriptions
      const cleanup = setupRealtimeSubscriptions();
      
      return cleanup;
    }
  }, [contractId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (!contractId) return;
    
    try {
      console.log('Fetching messages for contract:', contractId);

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('contract_messages')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        throw messagesError;
      }

      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs from messages
      const userIds = Array.from(new Set(messagesData.map(m => m.user_id)));
      
      // Fetch user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Create a map of profiles for quick lookup
      const profilesMap = new Map();
      if (profiles) {
        profiles.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }

      // Fetch reactions for all messages
      const messageIds = messagesData.map(m => m.id);
      const { data: reactionsData, error: reactionsError } = await supabase
        .from('contract_message_reactions')
        .select('*')
        .in('message_id', messageIds);

      if (reactionsError) {
        console.error('Error fetching reactions:', reactionsError);
      }

      // Group reactions by message
      const reactionsMap = new Map();
      if (reactionsData) {
        reactionsData.forEach(reaction => {
          if (!reactionsMap.has(reaction.message_id)) {
            reactionsMap.set(reaction.message_id, []);
          }
          reactionsMap.get(reaction.message_id).push({
            ...reaction,
            user: profilesMap.get(reaction.user_id) || { full_name: 'Unknown User' }
          });
        });
      }

      // Combine messages with profile data and reactions
      const messagesWithData = messagesData.map(message => ({
        ...message,
        user: profilesMap.get(message.user_id) || {
          id: message.user_id,
          full_name: 'Unknown User',
          email: '',
          role: 'buyer',
          avatar_url: null,
          phone: null,
          created_at: '',
          updated_at: ''
        },
        reactions: reactionsMap.get(message.id) || [],
        reply_to: null
      }));

      setMessages(messagesWithData);
      console.log('Messages loaded successfully:', messagesWithData.length);

    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminSessions = async () => {
    if (!contractId) return;
    
    try {
      const { data, error } = await supabase
        .from('admin_chat_sessions')
        .select(`
          *,
          admin:profiles(*)
        `)
        .eq('contract_id', contractId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching admin sessions:', error);
        return;
      }
      
      setAdminSessions(data || []);
    } catch (error) {
      console.error('Error fetching admin sessions:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    console.log('Setting up real-time subscriptions for contract:', contractId);

    // Create a unique channel for this contract
    const channel = supabase.channel(`contract-chat-${contractId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: user?.id }
      }
    });

    // Subscribe to message inserts
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contract_messages',
          filter: `contract_id=eq.${contractId}`,
        },
        async (payload) => {
          console.log('Real-time: New message received', payload);
          
          // Fetch the user profile for the new message
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.user_id)
            .single();

          const newMessage: Message = {
            ...payload.new,
            user: userProfile || {
              id: payload.new.user_id,
              full_name: 'Unknown User',
              email: '',
              role: 'buyer',
              avatar_url: null,
              phone: null,
              created_at: '',
              updated_at: ''
            },
            reactions: [],
            reply_to: null
          };

          setMessages(prev => {
            // Check if message already exists to prevent duplicates
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (exists) return prev;
            
            return [...prev, newMessage];
          });
        }
      )
      // Subscribe to reaction changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contract_message_reactions',
        },
        (payload) => {
          console.log('Real-time: Reaction change detected', payload);
          // Refresh messages to get updated reactions
          fetchMessages();
        }
      )
      // Subscribe to admin session changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_chat_sessions',
          filter: `contract_id=eq.${contractId}`,
        },
        (payload) => {
          console.log('Real-time: Admin session change detected', payload);
          fetchAdminSessions();
        }
      )
      .subscribe((status, err) => {
        console.log('Real-time subscription status:', status, err);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to real-time updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Real-time subscription error:', err);
        }
      });

    // Cleanup function
    return () => {
      console.log('Cleaning up real-time subscriptions');
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !contractId) return;

    setSending(true);
    try {
      console.log('Sending message:', newMessage);
      
      const messageData = {
        contract_id: contractId,
        user_id: user.id,
        message: newMessage.trim(),
        message_type: 'text' as const,
        reply_to_id: replyingTo?.id || null,
      };

      const { data, error } = await supabase
        .from('contract_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }
      
      console.log('Message sent successfully:', data);
      setNewMessage('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'document') => {
    const file = e.target.files?.[0];
    if (!file || !user || !contractId) return;

    setUploading(true);
    try {
      console.log('Uploading file:', file.name);
      const fileUrl = await uploadToCloudinary(file);
      
      const { error } = await supabase
        .from('contract_messages')
        .insert({
          contract_id: contractId,
          user_id: user.id,
          message: `Shared ${fileType}: ${file.name}`,
          message_type: 'file',
          file_url: fileUrl,
          file_type: fileType,
          file_size: file.size,
        });

      if (error) throw error;
      toast.success(`${fileType} shared successfully`);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(`Failed to share ${fileType}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const addReaction = async (messageId: string, reaction: string) => {
    if (!user) return;

    try {
      console.log('Adding reaction:', reaction, 'to message:', messageId);
      
      const { error } = await supabase
        .from('contract_message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          reaction,
        });

      if (error) {
        console.error('Error adding reaction:', error);
        throw error;
      }
      
      setShowReactions(null);
      console.log('Reaction added successfully');
    } catch (error) {
      console.error('Error adding reaction:', error);
      toast.error('Failed to add reaction');
    }
  };

  const removeReaction = async (messageId: string, reaction: string) => {
    if (!user) return;

    try {
      console.log('Removing reaction:', reaction, 'from message:', messageId);
      
      const { error } = await supabase
        .from('contract_message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('reaction', reaction);

      if (error) {
        console.error('Error removing reaction:', error);
        throw error;
      }
      
      console.log('Reaction removed successfully');
    } catch (error) {
      console.error('Error removing reaction:', error);
      toast.error('Failed to remove reaction');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isAdmin = profile?.role === 'admin';
  const activeAdmins = adminSessions.filter(session => session.is_active);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Real-time Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[700px] overflow-hidden flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">Enhanced Real-time Chat</CardTitle>
            <p className="text-sm text-gray-500">
              {isAdmin ? 'Admin participating in contract chat' : 'Chat with contract parties and admin support'}
            </p>
          </div>
          {activeAdmins.length > 0 && (
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-green-600" />
              <Badge className="bg-green-100 text-green-800">
                {activeAdmins.length} Admin{activeAdmins.length > 1 ? 's' : ''} Online
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-y-auto">
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 pb-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.user_id === user?.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${
                      message.user_id === user?.id ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.user.avatar_url || ''} />
                      <AvatarFallback className="text-xs">
                        {message.user.full_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        message.user_id === user?.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium">
                          {message.user.full_name}
                        </span>
                        {message.user.role === 'admin' && (
                          <Badge className="text-xs bg-red-500 text-white px-1 py-0">
                            Admin
                          </Badge>
                        )}
                      </div>

                      {message.reply_to && (
                        <div className="text-xs opacity-70 mb-2 p-2 bg-black/10 rounded">
                          <span className="font-medium">{message.reply_to.user?.full_name || 'User'}:</span>
                          <span className="ml-1">{message.reply_to.message}</span>
                        </div>
                      )}

                      {message.file_url && message.file_type === 'image' ? (
                        <div className="mb-2">
                          <img 
                            src={message.file_url} 
                            alt="Shared image" 
                            className="max-w-full h-auto rounded cursor-pointer"
                            onClick={() => window.open(message.file_url!, '_blank')}
                          />
                        </div>
                      ) : message.file_url ? (
                        <div className="mb-2">
                          <a
                            href={message.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs underline flex items-center"
                          >
                            <File className="h-3 w-3 mr-1" />
                            View File
                          </a>
                        </div>
                      ) : null}

                      <p className="text-sm">{message.message}</p>

                      {message.reactions && message.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(
                            message.reactions.reduce((acc, reaction) => {
                              acc[reaction.reaction] = (acc[reaction.reaction] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                          ).map(([reaction, count]) => (
                            <button
                              key={reaction}
                              onClick={() => {
                                const userReacted = message.reactions?.some(
                                  r => r.reaction === reaction && r.user_id === user?.id
                                );
                                if (userReacted) {
                                  removeReaction(message.id, reaction);
                                } else {
                                  addReaction(message.id, reaction);
                                }
                              }}
                              className="text-xs bg-white/20 rounded px-1 hover:bg-white/30 flex items-center space-x-1"
                            >
                              <span>{reaction}</span>
                              <span>{count}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs opacity-70">
                          {format(new Date(message.created_at), 'HH:mm')}
                          {message.edited_at && ' (edited)'}
                        </span>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => setReplyingTo(message)}
                            className="text-xs opacity-70 hover:opacity-100"
                          >
                            <Reply className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setShowReactions(
                              showReactions === message.id ? null : message.id
                            )}
                            className="text-xs opacity-70 hover:opacity-100"
                          >
                            <Smile className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {showReactions === message.id && (
                        <div className="flex space-x-1 mt-2 p-2 bg-white/10 rounded">
                          {REACTIONS.map((reaction) => (
                            <button
                              key={reaction}
                              onClick={() => addReaction(message.id, reaction)}
                              className="hover:bg-white/20 rounded p-1 text-lg"
                            >
                              {reaction}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="border-t p-4">
          {replyingTo && (
            <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
              <div className="flex justify-between items-center">
                <span>
                  Replying to <strong>{replyingTo.user.full_name}</strong>: {replyingTo.message}
                </span>
                <button onClick={() => setReplyingTo(null)} className="text-gray-500">
                  ×
                </button>
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={sending}
              className="flex-1"
            />
            
            <input
              ref={imageInputRef}
              type="file"
              onChange={(e) => handleFileUpload(e, 'image')}
              className="hidden"
              accept="image/*"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
              title="Share Image"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => handleFileUpload(e, 'document')}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Share File"
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <Button
              onClick={sendMessage}
              disabled={sending || !newMessage.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}