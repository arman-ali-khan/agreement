'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Clock, CheckCircle, Star, TrendingUp, Eye } from 'lucide-react';

interface Stats {
  total: number;
  active: number;
  draft: number;
  completed: number;
  totalViews: number;
  totalApplications: number;
  averageRating: number;
}

export function JobDashboardStats() {
  const [stats, setStats] = useState<Stats>({ 
    total: 0, 
    active: 0, 
    draft: 0, 
    completed: 0, 
    totalViews: 0,
    totalApplications: 0,
    averageRating: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      setError(null);
      console.log('Fetching job stats for user:', user.id);

      const { data, error } = await supabase
        .from('jobs')
        .select('status, views_count, applications_count, rating')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching job stats:', error);
        throw error;
      }

      const stats = data.reduce(
        (acc, job) => {
          acc.total++;
          acc.totalViews += job.views_count || 0;
          acc.totalApplications += job.applications_count || 0;
          
          if (job.rating && job.rating > 0) {
            acc.averageRating = (acc.averageRating + job.rating) / 2;
          }
          
          switch (job.status) {
            case 'draft':
              acc.draft++;
              break;
            case 'active':
              acc.active++;
              break;
            case 'completed':
              acc.completed++;
              break;
          }
          return acc;
        },
        { 
          total: 0, 
          active: 0, 
          draft: 0, 
          completed: 0, 
          totalViews: 0,
          totalApplications: 0,
          averageRating: 0
        }
      );

      console.log('Job stats fetched successfully:', stats);
      setStats(stats);
    } catch (error: any) {
      console.error('Error fetching job stats:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Gigs',
      value: stats.total,
      icon: Briefcase,
      description: 'All your gigs',
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    },
    {
      title: 'Active Gigs',
      value: stats.active,
      icon: TrendingUp,
      description: 'Currently available',
      color: 'bg-gradient-to-r from-green-500 to-emerald-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
    },
    {
      title: 'Total Views',
      value: stats.totalViews,
      icon: Eye,
      description: 'Profile visits',
      color: 'bg-gradient-to-r from-purple-500 to-purple-600',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    },
    {
      title: 'Applications',
      value: stats.totalApplications,
      icon: Clock,
      description: 'Client inquiries',
      color: 'bg-gradient-to-r from-yellow-500 to-orange-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      description: 'Finished projects',
      color: 'bg-gradient-to-r from-emerald-500 to-green-500',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
    },
    {
      title: 'Average Rating',
      value: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '--',
      icon: Star,
      description: 'Client satisfaction',
      color: 'bg-gradient-to-r from-orange-500 to-red-500',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-12 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.textColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  --
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Unable to load
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.textColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                {stat.value}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}