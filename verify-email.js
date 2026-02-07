// Quick script to verify an email in the database for testing
// Usage: node verify-email.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyEmail(email) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ verification_status: 'id_verified' })
      .eq('email', email);

    if (error) {
      console.error('Error updating profile:', error);
      process.exit(1);
    }

    console.log(`✓ Successfully verified email: ${email}`);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

const email = process.argv[2] || 'meashiadaniels@gmail.com';
verifyEmail(email);
