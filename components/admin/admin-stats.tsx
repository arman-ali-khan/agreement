'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, DollarSign, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalContracts: number;
  activeContracts: number;
  completedContracts: number;
  pendingContracts: number;
  disputedContracts: number;
  totalValue: number;
  monthlyGrowth: number;
}

export function AdminStats() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalContracts: 0,
    activeContracts: 0,
    completedContracts: 0,
    pendingContracts: 0,
    disputedContracts: 0,
    totalValue: 0,
    monthlyGrowth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      // Fetch user stats
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, created_at');

      if (usersError) throw usersError;

      // Fetch contract stats
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('status, created_at');

      if (contractsError) throw contractsError;

      // Calculate stats
      const totalUsers = users?.length || 0;
      const totalContracts = contracts?.length || 0;
      
      const contractStats = contracts?.reduce(
        (acc, contract) => {
          switch (contract.status) {
            case 'active':
            case 'fulfilled':
              acc.active++;
              break;
            case 'completed':
              acc.completed++;
              break;
            case 'pending':
              acc.pending++;
              break;
            case 'disputed':
              acc.disputed++;
              break;
          }
          return acc;
        },
        { active: 0, completed: 0, pending: 0, disputed: 0 }
      ) || { active: 0, completed: 0, pending: 0, disputed: 0 };

      // Calculate monthly growth
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthUsers = users?.filter(user => {
        const userDate = new Date(user.created_at);
        return userDate.getMonth() === currentMonth && userDate.getFullYear() === currentYear;
      }).length || 0;

      const lastMonthUsers = users?.filter(user => {
        const userDate = new Date(user.created_at);
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return userDate.getMonth() === lastMonth && userDate.getFullYear() === lastMonthYear;
      }).length || 0;

      const monthlyGrowth = lastMonthUsers > 0 ? ((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100 : 0;

      setStats({
        totalUsers,
        totalContracts,
        activeContracts: contractStats.active,
        completedContracts: contractStats.completed,
        pendingContracts: contractStats.pending,
        disputedContracts: contractStats.disputed,
        totalValue: totalContracts * 1000, // Mock value calculation
        monthlyGrowth,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      description: 'Registered users',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    },
    {
      title: 'Total Contracts',
      value: stats.totalContracts,
      icon: FileText,
      description: 'All agreements',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    },
    {
      title: 'Active Deals',
      value: stats.activeContracts,
      icon: TrendingUp,
      description: 'In progress',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
    },
    {
      title: 'Completed',
      value: stats.completedContracts,
      icon: CheckCircle,
      description: 'Successfully closed',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
    },
    {
      title: 'Pending Review',
      value: stats.pendingContracts,
      icon: AlertTriangle,
      description: 'Awaiting action',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
    },
    {
      title: 'Monthly Growth',
      value: `${stats.monthlyGrowth.toFixed(1)}%`,
      icon: TrendingUp,
      description: 'User growth rate',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/20',
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
                <Icon className={`h-4 w-4 ${stat.color}`} />
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