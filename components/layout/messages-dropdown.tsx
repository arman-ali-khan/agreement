'use client';

import { useState } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MessageSquare, 
  Settings,
  Check,
  X,
  Paperclip
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function MessagesDropdown() {
  const {
    messages,
    unreadMessagesCount,
    loading,
    markMessageAsRead,
    markAllMessagesAsRead
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleMessageClick = async (message: any) => {
    // Mark as read
    if (!message.read) {
      await markMessageAsRead(message.id);
    }

    // Navigate to appropriate page based on message type
    if (message.message_type === 'gig_related' && message.related_job_id) {
      router.push(`/jobs/${message.related_job_id}`);
    } else if (message.related_contract_id) {
      router.push(`/contracts/${message.related_contract_id}`);
    } else {
      // Navigate to messages page or open message modal
      router.push('/messages');
    }

    setOpen(false);
  };

  const getMessageTypeIcon = (messageType: string) => {
    switch (messageType) {
      case 'gig_related':
        return '💼';
      case 'proof_message':
        return '📎';
      default:
        return '💬';
    }
  };

  const truncateMessage = (message: string, maxLength: number = 60) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <MessageSquare className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <MessageSquare className="h-5 w-5" />
          {unreadMessagesCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Messages</h3>
          <div className="flex items-center space-x-2">
            {unreadMessagesCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllMessagesAsRead}
                className="text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-96">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">No messages yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-start space-x-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors",
                    !message.read && "bg-blue-50 dark:bg-blue-950/20"
                  )}
                  onClick={() => handleMessageClick(message)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={message.sender?.avatar_url || ''} />
                    <AvatarFallback className="text-xs">
                      {message.sender?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className={cn(
                            "text-sm",
                            !message.read && "font-medium"
                          )}>
                            {message.sender?.full_name || 'Unknown User'}
                          </p>
                          <span className="text-xs">
                            {getMessageTypeIcon(message.message_type)}
                          </span>
                          {message.attachment_url && (
                            <Paperclip className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                        
                        {message.subject && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                            {message.subject}
                          </p>
                        )}
                        
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {truncateMessage(message.message)}
                        </p>
                        
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(message.created_at), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-1 ml-2">
                        {!message.read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {messages.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button 
                variant="ghost" 
                className="w-full text-sm" 
                size="sm"
                onClick={() => {
                  router.push('/messages');
                  setOpen(false);
                }}
              >
                View all messages
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}