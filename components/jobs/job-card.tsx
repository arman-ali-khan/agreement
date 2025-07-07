'use client';

import { useState } from 'react';
import { Job } from '@/lib/types/job';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Star, 
  Eye, 
  MessageSquare, 
  MoreHorizontal,
  Edit,
  Trash2,
  Play,
  Pause,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface JobCardProps {
  job: Job;
  onStatusChange: (jobId: string, status: string) => void;
  onDelete: (jobId: string) => void;
}

export function JobCard({ job, onStatusChange, onDelete }: JobCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPriceDisplay = () => {
    if (job.pricing_type === 'hourly' && job.hourly_rate) {
      return `$${job.hourly_rate}/hr`;
    } else if (job.pricing_type === 'fixed' && job.base_price) {
      return `$${job.base_price}`;
    } else if (job.pricing_type === 'package') {
      return 'Package deals';
    }
    return 'Contact for pricing';
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true);
    try {
      await onStatusChange(job.id, newStatus);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onDelete(job.id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <CardTitle className="text-lg line-clamp-2">{job.title}</CardTitle>
              <Badge className={getStatusColor(job.status)}>
                {job.status.toUpperCase()}
              </Badge>
            </div>
            <CardDescription className="line-clamp-2">{job.description}</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" disabled={isLoading}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/jobs/${job.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </DropdownMenuItem>
              {job.status === 'draft' && (
                <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                  <Play className="h-4 w-4 mr-2" />
                  Publish
                </DropdownMenuItem>
              )}
              {job.status === 'active' && (
                <DropdownMenuItem onClick={() => handleStatusChange('paused')}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </DropdownMenuItem>
              )}
              {job.status === 'paused' && (
                <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </DropdownMenuItem>
              )}
              {(job.status === 'active' || job.status === 'paused') && (
                <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Complete
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-red-600 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>{job.views_count} views</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageSquare className="h-4 w-4" />
              <span>{job.applications_count} applications</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span>{job.rating > 0 ? job.rating.toFixed(1) : '--'}</span>
            <span className="text-gray-400">({job.reviews_count})</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {getPriceDisplay()}
            </p>
            {job.delivery_time && (
              <p className="text-sm text-gray-500">
                {job.delivery_time} day{job.delivery_time > 1 ? 's' : ''} delivery
              </p>
            )}
          </div>
          {job.category && (
            <Badge variant="outline" className="text-xs">
              {job.category.icon} {job.category.name}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Created {format(new Date(job.created_at), 'MMM dd, yyyy')}</span>
          <span>Updated {format(new Date(job.updated_at), 'MMM dd, yyyy')}</span>
        </div>

        <div className="flex space-x-2 pt-2">
          <Link href={`/jobs/${job.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </Link>
          <Link href={`/jobs/${job.id}/applications`}>
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Applications
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}