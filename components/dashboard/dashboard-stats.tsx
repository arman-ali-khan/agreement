'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, CheckCircle, DollarSign, TrendingUp } from 'lucide-react';

interface Stats {
  total: number;
  pending: number;
  active: number;
  completed: number;
  fulfilled: number;
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, active: 0, completed: 0, fulfilled: 0 });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('status')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

      if (error) throw error;

      const stats = data.reduce(
        (acc, contract) => {
          acc.total++;
          switch (contract.status) {
            case 'pending':
              acc.pending++;
              break;
            case 'active':
              acc.active++;
              break;
            case 'completed':
              acc.completed++;
              break;
            case 'fulfilled':
              acc.fulfilled++;
              break;
          }
          return acc;
        },
        { total: 0, pending: 0, active: 0, completed: 0, fulfilled: 0 }
      );

      setStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Contracts',
      value: stats.total,
      icon: FileText,
      description: 'All your contracts',
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    },
    {
      title: 'Pending Review',
      value: stats.pending,
      icon: Clock,
      description: 'Awaiting acceptance',
      color: 'bg-gradient-to-r from-yellow-500 to-orange-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
    },
    {
      title: 'Active Deals',
      value: stats.active + stats.fulfilled,
      icon: TrendingUp,
      description: 'In progress',
      color: 'bg-gradient-to-r from-purple-500 to-purple-600',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      description: 'Successfully closed',
      color: 'bg-gradient-to-r from-green-500 to-emerald-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
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

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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