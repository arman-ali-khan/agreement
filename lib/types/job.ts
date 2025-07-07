import { Database } from '@/lib/supabase';

export type JobCategory = Database['public']['Tables']['job_categories']['Row'];

export type Job = Database['public']['Tables']['jobs']['Row'] & {
  category?: JobCategory;
  user?: Database['public']['Tables']['profiles']['Row'];
  skills?: JobSkill[];
  portfolio_items?: JobPortfolioItem[];
  packages?: JobPackage[];
};

export type JobSkill = Database['public']['Tables']['job_skills']['Row'];

export type JobPortfolioItem = Database['public']['Tables']['job_portfolio_items']['Row'];

export type JobPackage = Database['public']['Tables']['job_packages']['Row'];

export type JobApplication = Database['public']['Tables']['job_applications']['Row'] & {
  job?: Job;
  applicant?: Database['public']['Tables']['profiles']['Row'];
  package?: JobPackage;
};

export type JobReview = Database['public']['Tables']['job_reviews']['Row'] & {
  reviewer?: Database['public']['Tables']['profiles']['Row'];
};

export type JobFormData = {
  title: string;
  category_id: string;
  description: string;
  pricing_type: 'hourly' | 'fixed' | 'package';
  base_price?: number;
  hourly_rate?: number;
  delivery_time?: number;
  revisions_included: number;
  requirements: string;
  terms_conditions: string;
  skills: string[];
  portfolio_items: {
    title: string;
    description: string;
    image_url?: string;
    file_url?: string;
    file_type: 'image' | 'video' | 'document' | 'link';
  }[];
  packages: {
    name: string;
    description: string;
    price: number;
    delivery_time: number;
    revisions_included: number;
    features: string[];
    is_popular: boolean;
  }[];
  availability_hours: {
    [key: string]: { start: string; end: string; available: boolean };
  };
  response_time: string;
};