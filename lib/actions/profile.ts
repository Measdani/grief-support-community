'use server'

import { createClient } from '@/lib/supabase/server'

export async function createUserProfile(userId: string, email: string) {
  const supabase = await createClient()

  try {
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      return { success: true, message: 'Profile already exists' }
    }

    // Create profile for new user
    const { error } = await supabase.from('profiles').insert({
      id: userId,
      email: email,
      verification_status: 'unverified',
    })

    if (error) {
      console.error('Error creating profile:', error)
      return { success: false, error: error.message }
    }

    return { success: true, message: 'Profile created successfully' }
  } catch (err) {
    console.error('Unexpected error creating profile:', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
