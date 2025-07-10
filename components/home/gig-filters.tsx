'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { 
  Filter, 
  ChevronDown, 
  X,
  DollarSign,
  Clock,
  Star,
  TrendingUp
} from 'lucide-react';
import { JobCategory } from '@/lib/types/job';

interface GigFiltersProps {
  categories: JobCategory[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

export function GigFilters({
  categories,
  selectedCategory,
  onCategoryChange,
  priceRange,
  onPriceRangeChange,
  sortBy,
  onSortChange,
  showFilters,
  onToggleFilters
}: GigFiltersProps) {
  const [deliveryTime, setDeliveryTime] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);

  const sortOptions = [
    { value: 'newest', label: 'Newest First', icon: Clock },
    { value: 'oldest', label: 'Oldest First', icon: Clock },
    { value: 'price_low', label: 'Price: Low to High', icon: DollarSign },
    { value: 'price_high', label: 'Price: High to Low', icon: DollarSign },
    { value: 'rating', label: 'Highest Rated', icon: Star },
    { value: 'popular', label: 'Most Popular', icon: TrendingUp },
  ];

  const deliveryOptions = [
    { value: 'all', label: 'Any delivery time' },
    { value: '1', label: '1 day' },
    { value: '3', label: '3 days' },
    { value: '7', label: '1 week' },
    { value: '14', label: '2 weeks' },
    { value: '30', label: '1 month' },
  ];

  const clearFilters = () => {
    onCategoryChange('all');
    onPriceRangeChange([0, 10000]);
    setDeliveryTime('all');
    setMinRating(0);
    onSortChange('newest');
  };

  const hasActiveFilters = 
    selectedCategory !== 'all' ||
    priceRange[0] > 0 ||
    priceRange[1] < 10000 ||
    deliveryTime !== 'all' ||
    minRating > 0;

  return (
    <div className="space-y-4">
      {/* Quick Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Categories */}
        <div className="flex items-center space-x-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange('all')}
            className="whitespace-nowrap"
          >
            All Categories
          </Button>
          {categories.slice(0, 5).map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => onCategoryChange(category.id)}
              className="whitespace-nowrap"
            >
              {category.icon} {category.name}
            </Button>
          ))}
          {categories.length > 5 && (
            <Select value={selectedCategory} onValueChange={onCategoryChange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="More categories..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.slice(5).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => {
              const Icon = option.icon;
              return (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Advanced Filters Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleFilters}
          className="flex items-center space-x-2"
        >
          <Filter className="h-4 w-4" />
          <span>Filters</span>
          {hasActiveFilters && (
            <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
              !
            </Badge>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </Button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-red-600 hover:text-red-700"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      <Collapsible open={showFilters}>
        <CollapsibleContent>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Advanced Filters</CardTitle>
              <CardDescription>
                Refine your search to find exactly what you're looking for
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Price Range */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Price Range</label>
                  <div className="px-3">
                    <Slider
                      value={priceRange}
                      onValueChange={(value) => onPriceRangeChange(value as [number, number])}
                      max={10000}
                      min={0}
                      step={50}
                      className="w-full"
                    />
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>${priceRange[0]}</span>
                    <span>${priceRange[1]}+</span>
                  </div>
                </div>

                {/* Delivery Time */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Delivery Time</label>
                  <Select value={deliveryTime} onValueChange={setDeliveryTime}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Minimum Rating */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Minimum Rating</label>
                  <div className="flex space-x-2">
                    {[0, 3, 4, 4.5, 5].map((rating) => (
                      <Button
                        key={rating}
                        variant={minRating === rating ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMinRating(rating)}
                        className="flex items-center space-x-1"
                      >
                        <Star className="h-3 w-3" />
                        <span>{rating === 0 ? 'Any' : `${rating}+`}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active Filters Summary */}
              {hasActiveFilters && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {selectedCategory !== 'all' && (
                        <Badge variant="secondary">
                          Category: {categories.find(c => c.id === selectedCategory)?.name}
                          <button
                            onClick={() => onCategoryChange('all')}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {(priceRange[0] > 0 || priceRange[1] < 10000) && (
                        <Badge variant="secondary">
                          Price: ${priceRange[0]} - ${priceRange[1]}
                          <button
                            onClick={() => onPriceRangeChange([0, 10000])}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {deliveryTime !== 'all' && (
                        <Badge variant="secondary">
                          Delivery: {deliveryOptions.find(d => d.value === deliveryTime)?.label}
                          <button
                            onClick={() => setDeliveryTime('all')}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      {minRating > 0 && (
                        <Badge variant="secondary">
                          Rating: {minRating}+ stars
                          <button
                            onClick={() => setMinRating(0)}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-red-600 hover:text-red-700"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}