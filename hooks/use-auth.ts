'use client';

import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Database } from '@/lib/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, this is expected for new users
          console.log('Profile not found for user:', userId);
        } else {
          throw error;
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProfileManually = async (userId: string, email: string, fullName: string, phone: string, role: 'buyer' | 'seller') => {
    try {
      console.log('Creating profile manually for user:', userId);
      
      // First try using the database function
      const { data: functionResult, error: functionError } = await supabase
        .rpc('create_profile_if_missing', {
          user_id: userId,
          user_email: email,
          user_full_name: fullName,
          user_phone: phone,
          user_role: role
        });

      if (functionError) {
        console.error('Function error:', functionError);
        // Fallback to direct insert
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: email,
            full_name: fullName,
            phone: phone,
            role: role,
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            // Profile already exists, fetch it
            console.log('Profile already exists, fetching...');
            await fetchProfile(userId);
            return;
          }
          throw error;
        }
        
        setProfile(data);
      } else {
        console.log('Profile creation function result:', functionResult);
        // Fetch the created profile
        await fetchProfile(userId);
      }
    } catch (error) {
      console.error('Error creating profile manually:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string, phone: string, role: 'buyer' | 'seller') => {
    try {
      console.log('Starting signup process for:', email);
      
      // Sign up the user with metadata - no email verification required
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: role,
          },
          // Disable email verification
          emailRedirectTo: undefined,
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        console.log('User created successfully:', authData.user.id);
        
        // Since email verification is disabled, the user should be immediately available
        // Wait a shorter time for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if profile was created by the trigger
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profileCheckError && profileCheckError.code === 'PGRST116') {
          // Profile doesn't exist, create it manually
          console.log('Profile not found, creating manually...');
          await createProfileManually(authData.user.id, email, fullName, phone, role);
        } else if (profileCheckError) {
          console.error('Error checking for existing profile:', profileCheckError);
          // Try to create it anyway
          await createProfileManually(authData.user.id, email, fullName, phone, role);
        } else {
          console.log('Profile already exists:', existingProfile);
          setProfile(existingProfile);
        }
      }

      return authData;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    setProfile(data);
    return data;
  };

  return {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };
}