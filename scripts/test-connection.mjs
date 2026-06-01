// Diagnostic script to check Supabase connection
import { createClient } from '@supabase/supabase-js';

console.log('🔍 Checking environment variables...\n');

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('VITE_SUPABASE_URL:', url ? '✅ Set' : '❌ Missing');
console.log('VITE_SUPABASE_ANON_KEY:', anonKey ? `✅ Set (${anonKey.substring(0, 10)}...)` : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? `✅ Set (${serviceKey.substring(0, 10)}...)` : '❌ Missing');

if (!url || !serviceKey) {
  console.error('\n❌ Missing required environment variables!');
  console.error('\nYour .env file needs:');
  console.error('  VITE_SUPABASE_URL=https://xxxxx.supabase.co');
  console.error('  VITE_SUPABASE_ANON_KEY=eyJ...');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=eyJ...');
  console.error('\nGet these from: https://app.supabase.com/project/[your-project]/settings/api');
  process.exit(1);
}

console.log('\n🔗 Testing Supabase connection...\n');

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function test() {
  try {
    // Test 1: List users
    console.log('Test 1: Listing users...');
    const { data: { users }, error: listError } = await admin.auth.admin.listUsers();
    if (listError) {
      console.error('❌ Error:', listError.message);
      console.error('   Code:', listError.code);
      return;
    }
    console.log(`✅ Found ${users.length} users`);

    // Test 2: Query profiles table
    console.log('\nTest 2: Querying profiles table...');
    const { data: profiles, error: profileError } = await admin
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (profileError) {
      console.error('❌ Error:', profileError.message);
      console.error('   Code:', profileError.code);
      return;
    }
    console.log(`✅ Found ${profiles.length} profiles`);

    // Test 3: Check schema
    console.log('\nTest 3: Checking auth.users columns...');
    const { data: columns, error: columnError } = await admin
      .rpc('query_columns', {
        schema_name: 'auth',
        table_name: 'users'
      })
      .catch(() => ({ data: null, error: { message: 'RPC not available' } }));

    if (columnError) {
      console.warn('⚠️  RPC not available, but that\'s OK');
    } else if (columns) {
      console.log(`✅ Found ${columns.length} columns`);
    }

    console.log('\n✅ All tests passed! Supabase is accessible.');
    console.log('\nYou can now run: node --env-file=.env scripts/create-admin.mjs');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

test();
