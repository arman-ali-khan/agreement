'use client';

import { AuthForm } from '@/components/auth/auth-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Briefcase, CheckCircle, Star, Search, Users, Shield, Zap, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="container mx-auto px-4 pt-8 pb-16">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-xl">
                <Briefcase className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              GigHub
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
              The premier platform for freelancers and clients to connect, collaborate, and create amazing projects together.
              Showcase your skills, find the perfect gig, and build your dream career.
            </p>
            <div className="flex justify-center space-x-4">
              <Link href="#features">
                <Button variant="outline" size="lg" className="hover:bg-blue-50 dark:hover:bg-blue-950">
                  Learn More
                </Button>
              </Link>
              <Link href="#auth">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white/50 dark:bg-gray-800/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-gray-100">
            Why Choose GigHub?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-200">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <Search className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <CardTitle className="text-xl">Easy Discovery</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Advanced search and filtering help clients find the perfect freelancer for their project needs.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-200">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <Star className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <CardTitle className="text-xl">Quality Assurance</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Comprehensive rating and review system ensures high-quality work and trusted partnerships.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-200">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-xl">Secure Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Protected payment system with escrow services ensures safe transactions for both parties.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-gray-100">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  1
                </div>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Create Your Gig</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Showcase your skills, set your prices, and create compelling service offerings
              </p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  2
                </div>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Get Discovered</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Clients browse and find your services through our powerful search and recommendation engine
              </p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  3
                </div>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Deliver Excellence</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Work with clients, deliver high-quality results, and build lasting professional relationships
              </p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  4
                </div>
              </div>
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Grow Your Business</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Earn reviews, build reputation, and scale your freelance business to new heights
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50 dark:bg-gray-800/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">10K+</div>
              <div className="text-gray-600 dark:text-gray-300">Active Freelancers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-2">50K+</div>
              <div className="text-gray-600 dark:text-gray-300">Projects Completed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600 mb-2">98%</div>
              <div className="text-gray-600 dark:text-gray-300">Client Satisfaction</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-600 mb-2">24/7</div>
              <div className="text-gray-600 dark:text-gray-300">Support Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Section */}
      <section id="auth" className="py-16">
        <div className="container mx-auto px-4">
          <AuthForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <Briefcase className="h-6 w-6" />
            <span className="text-xl font-bold">GigHub</span>
          </div>
          <p className="text-gray-400 text-sm">
            © 2025 GigHub. All rights reserved. Connecting talent with opportunity.
          </p>
        </div>
      </footer>
    </div>
  );
}