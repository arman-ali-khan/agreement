'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { Job, JobCategory } from '@/lib/types/job';
import { Navbar } from '@/components/layout/navbar';
import { GigCard } from '@/components/home/gig-card';
import { GigFilters } from '@/components/home/gig-filters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  Star, 
  TrendingUp, 
  Clock,
  Users,
  Briefcase,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface GigWithDetails extends Job {
  user: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
  category: JobCategory | null;
  skills: Array<{ skill_name: string }>;
  packages: Array<{
    id: string;
    name: string;
    price: number;
    delivery_time: number;
    description: string;
    is_popular: boolean;
  }>;
}

export function GigsHomePage() {
  const [gigs, setGigs] = useState<GigWithDetails[]>([]);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    fetchCategories();
    fetchGigs();
  }, [selectedCategory, sortBy]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('job_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const fetchGigs = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('jobs')
        .select(`
          *,
          user:profiles!jobs_user_id_fkey(id, full_name, avatar_url, role),
          category:job_categories(id, name, icon),
          skills:job_skills(skill_name),
          packages:job_packages(id, name, price, delivery_time, description, is_popular)
        `)
        .eq('status', 'active');

      // Apply category filter
      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory);
      }

      // Apply sorting
      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'price_low':
          query = query.order('base_price', { ascending: true, nullsFirst: false });
          break;
        case 'price_high':
          query = query.order('base_price', { ascending: false, nullsFirst: false });
          break;
        case 'rating':
          query = query.order('rating', { ascending: false });
          break;
        case 'popular':
          query = query.order('applications_count', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setGigs(data || []);
    } catch (error) {
      console.error('Error fetching gigs:', error);
      toast.error('Failed to load gigs');
    } finally {
      setLoading(false);
    }
  };

  const filteredGigs = gigs.filter(gig => {
    // Search filter
    const matchesSearch = 
      gig.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gig.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gig.skills.some(skill => skill.skill_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      gig.user.full_name.toLowerCase().includes(searchTerm.toLowerCase());

    // Price filter
    const gigPrice = gig.base_price || 
      (gig.packages.length > 0 ? Math.min(...gig.packages.map(p => p.price)) : 0);
    const matchesPrice = gigPrice >= priceRange[0] && gigPrice <= priceRange[1];

    return matchesSearch && matchesPrice;
  });

  const featuredGigs = filteredGigs.filter(gig => gig.featured).slice(0, 6);
  const topRatedGigs = filteredGigs
    .filter(gig => gig.rating > 4.5)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 6);
  const newGigs = filteredGigs
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Find the Perfect <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Freelance Services</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto">
            Discover talented freelancers ready to help you with your projects. From web development to design, find the expertise you need.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search for services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-3 text-lg border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-blue-500 dark:focus:border-blue-400"
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{gigs.length}+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active Gigs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{categories.length}+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Categories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {gigs.reduce((sum, gig) => sum + gig.applications_count, 0)}+
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Projects Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">4.8★</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Average Rating</div>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          <div className="flex-1">
            <GigFilters
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              sortBy={sortBy}
              onSortChange={setSortBy}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
            />
          </div>
          
          {profile?.role === 'seller' && (
            <div>
              <Link href="/jobs/new">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Gig
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="all" className="flex items-center space-x-2">
              <Briefcase className="h-4 w-4" />
              <span>All Gigs ({filteredGigs.length})</span>
            </TabsTrigger>
            <TabsTrigger value="featured" className="flex items-center space-x-2">
              <Star className="h-4 w-4" />
              <span>Featured ({featuredGigs.length})</span>
            </TabsTrigger>
            <TabsTrigger value="top-rated" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Top Rated ({topRatedGigs.length})</span>
            </TabsTrigger>
            <TabsTrigger value="new" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>New ({newGigs.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(9)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredGigs.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <CardTitle className="text-xl mb-2">No gigs found</CardTitle>
                  <CardDescription>
                    Try adjusting your search criteria or browse different categories.
                  </CardDescription>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGigs.map((gig) => (
                  <GigCard key={gig.id} gig={gig} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="featured">
            {featuredGigs.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <CardTitle className="text-xl mb-2">No featured gigs</CardTitle>
                  <CardDescription>
                    Check back later for featured services from top freelancers.
                  </CardDescription>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredGigs.map((gig) => (
                  <GigCard key={gig.id} gig={gig} featured />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="top-rated">
            {topRatedGigs.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <CardTitle className="text-xl mb-2">No top-rated gigs yet</CardTitle>
                  <CardDescription>
                    Top-rated services will appear here as freelancers receive reviews.
                  </CardDescription>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topRatedGigs.map((gig) => (
                  <GigCard key={gig.id} gig={gig} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="new">
            {newGigs.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <CardTitle className="text-xl mb-2">No new gigs</CardTitle>
                  <CardDescription>
                    New services will appear here as freelancers create them.
                  </CardDescription>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {newGigs.map((gig) => (
                  <GigCard key={gig.id} gig={gig} isNew />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Call to Action for Non-Sellers */}
        {profile?.role !== 'seller' && (
          <Card className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-0">
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle className="text-2xl mb-4">Ready to offer your services?</CardTitle>
              <CardDescription className="text-lg mb-6 max-w-2xl mx-auto">
                Join thousands of freelancers earning money by offering their skills and expertise to clients worldwide.
              </CardDescription>
              <Link href="/jobs/new">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Plus className="h-5 w-5 mr-2" />
                  Start Selling Your Services
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}