'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Star, 
  Clock, 
  Eye, 
  MessageSquare, 
  Heart,
  Bookmark,
  Share2,
  CheckCircle,
  DollarSign,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GigCardProps {
  gig: any;
  featured?: boolean;
  isNew?: boolean;
}

export function GigCard({ gig, featured = false, isNew = false }: GigCardProps) {
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const { user, profile } = useAuth();

  const getPriceDisplay = () => {
    if (gig.pricing_type === 'hourly' && gig.hourly_rate) {
      return `$${gig.hourly_rate}/hr`;
    } else if (gig.pricing_type === 'fixed' && gig.base_price) {
      return `$${gig.base_price}`;
    } else if (gig.pricing_type === 'package' && gig.packages.length > 0) {
      const minPrice = Math.min(...gig.packages.map((p: any) => p.price));
      const maxPrice = Math.max(...gig.packages.map((p: any) => p.price));
      if (minPrice === maxPrice) {
        return `$${minPrice}`;
      }
      return `$${minPrice} - $${maxPrice}`;
    }
    return 'Contact for pricing';
  };

  const handleApply = async () => {
    if (!user) {
      toast.error('Please sign in to apply for gigs');
      return;
    }

    if (!applicationMessage.trim()) {
      toast.error('Please enter a message for your application');
      return;
    }

    setIsApplying(true);
    try {
      const { error } = await supabase
        .from('job_applications')
        .insert({
          job_id: gig.id,
          applicant_id: user.id,
          message: applicationMessage.trim()
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already applied to this gig');
        } else {
          throw error;
        }
      } else {
        toast.success('Application submitted successfully!');
        setShowApplicationModal(false);
        setApplicationMessage('');
      }
    } catch (error) {
      console.error('Error applying to gig:', error);
      toast.error('Failed to submit application');
    } finally {
      setIsApplying(false);
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      toast.error('Please sign in to bookmark gigs');
      return;
    }

    // This would require a bookmarks table - for now just show UI feedback
    setIsBookmarked(!isBookmarked);
    toast.success(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: gig.title,
          text: gig.description,
          url: window.location.origin + `/jobs/${gig.id}`
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.origin + `/jobs/${gig.id}`);
      toast.success('Link copied to clipboard');
    }
  };

  const isOwnGig = user?.id === gig.user_id;

  return (
    <Card className={cn(
      "group hover:shadow-xl transition-all duration-300 border-0 shadow-md overflow-hidden",
      featured && "ring-2 ring-yellow-400 shadow-yellow-100 dark:shadow-yellow-900/20",
      isNew && "ring-2 ring-green-400 shadow-green-100 dark:shadow-green-900/20"
    )}>
      {/* Header Badges */}
      <div className="absolute top-4 left-4 z-10 flex flex-col space-y-2">
        {featured && (
          <Badge className="bg-yellow-500 text-white shadow-lg">
            <Star className="h-3 w-3 mr-1" />
            Featured
          </Badge>
        )}
        {isNew && (
          <Badge className="bg-green-500 text-white shadow-lg">
            New
          </Badge>
        )}
      </div>

      {/* Action Buttons */}
      <div className="absolute top-4 right-4 z-10 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-white/90 hover:bg-white shadow-lg"
          onClick={handleBookmark}
        >
          <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current text-blue-600")} />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 bg-white/90 hover:bg-white shadow-lg"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>

      <CardHeader className="pb-3">
        {/* User Info */}
        <div className="flex items-center space-x-3 mb-3">
          <Avatar className="h-10 w-10 border-2 border-white shadow-md">
            <AvatarImage src={gig.user.avatar_url || ''} />
            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              {gig.user.full_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium text-sm">{gig.user.full_name}</p>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs capitalize">
                {gig.user.role}
              </Badge>
              {gig.category && (
                <span className="text-xs text-gray-500">
                  {gig.category.icon} {gig.category.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Title */}
        <CardTitle className="text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
          <Link href={`/jobs/${gig.id}`}>
            {gig.title}
          </Link>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        <CardDescription className="line-clamp-3 text-sm">
          {gig.description}
        </CardDescription>

        {/* Skills */}
        {gig.skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {gig.skills.slice(0, 3).map((skill: any, index: number) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {skill.skill_name}
              </Badge>
            ))}
            {gig.skills.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{gig.skills.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>{gig.rating > 0 ? gig.rating.toFixed(1) : '--'}</span>
              <span className="text-gray-400">({gig.reviews_count})</span>
            </div>
            <div className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>{gig.views_count}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageSquare className="h-4 w-4" />
              <span>{gig.applications_count}</span>
            </div>
          </div>
          {gig.delivery_time && (
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{gig.delivery_time} days</span>
            </div>
          )}
        </div>

        {/* Pricing and Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <div className="text-lg font-bold text-green-600">
              {getPriceDisplay()}
            </div>
            <div className="text-xs text-gray-500">
              {format(new Date(gig.created_at), 'MMM dd, yyyy')}
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Link href={`/jobs/${gig.id}`}>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
            </Link>
            
            {!isOwnGig && user && (
              <Dialog open={showApplicationModal} onOpenChange={setShowApplicationModal}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Apply Now
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Apply to "{gig.title}"</DialogTitle>
                    <DialogDescription>
                      Send a message to {gig.user.full_name} explaining why you're interested in this gig.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="message">Your Message</Label>
                      <Textarea
                        id="message"
                        value={applicationMessage}
                        onChange={(e) => setApplicationMessage(e.target.value)}
                        placeholder="Hi! I'm interested in your gig because..."
                        rows={4}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowApplicationModal(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleApply}
                        disabled={isApplying || !applicationMessage.trim()}
                      >
                        {isApplying ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Applying...
                          </>
                        ) : (
                          'Send Application'
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            
            {!user && (
              <Link href="/auth">
                <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Sign In to Apply
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}