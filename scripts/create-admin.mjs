// Admin user creation using Supabase Management API
import https from 'https';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey || !supabaseUrl) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_URL in .env');
  process.exit(1);
}

const email = 'admin@eyoenian.com';
const password = 'Admin@12345678';

// Parse URL
const urlObj = new URL(supabaseUrl);
const hostname = urlObj.hostname;

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port: 443,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey
      }
    };

    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  try {
    console.log('🧹 Cleaning up old attempts...');
    
    // Delete from profiles
    try {
      const deleteResp = await makeRequest('DELETE', `/rest/v1/profiles?email=eq.${email}`, null);
      console.log('  ✅ Profiles cleaned');
    } catch (e) {
      console.log('  ⚠️  Could not clean profiles');
    }

    // Delete auth user (need to get ID first - skip if can't list)
    console.log('  ⏳ Old auth entries will be replaced...');

    console.log('👤 Creating admin user via Management API...');
    
    const createResp = await makeRequest('POST', '/auth/v1/admin/users', {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Administrateur',
        role: 'admin'
      }
    });

    if (createResp.status !== 201) {
      if (createResp.status === 422 && createResp.data.error_code === 'user_already_exists') {
        console.error('❌ User already exists');
        console.error('\nTo delete the existing user, run in Supabase SQL Editor:');
        console.error('  DELETE FROM auth.users WHERE email = \'admin@eyoenian.com\';');
        process.exit(1);
      }
      console.error('❌ Creation failed:', createResp.status);
      console.error('   Response:', createResp.data);
      process.exit(1);
    }

    const userId = createResp.data.id;
    console.log('✅ Admin user created:', userId);

    // Wait for trigger
    console.log('⏳ Waiting for profile creation...');
    await new Promise(r => setTimeout(r, 1500));

    // Check profile via REST API
    const profileResp = await makeRequest('GET', `/rest/v1/profiles?id=eq.${userId}`, null);
    
    if (profileResp.status === 200 && profileResp.data.length > 0) {
      console.log('✅ Profile exists:', profileResp.data[0].role);
    } else {
      console.log('📝 Creating profile manually...');
      const insertResp = await makeRequest('POST', '/rest/v1/profiles', {
        id: userId,
        email,
        full_name: 'Administrateur',
        role: 'admin',
        is_active: true
      });

      if (insertResp.status !== 201) {
        console.error('❌ Profile creation failed:', insertResp.status);
        console.error('   Response:', insertResp.data);
        
        // But admin user was created, so show info anyway
        console.log('\n⚠️  Admin user was created but profile insert failed.');
        console.log('    This might be due to RLS policies.');
        console.log('\n    To fix, run in Supabase SQL Editor:');
        console.log(`    INSERT INTO public.profiles (id, email, full_name, role, is_active)`);
        console.log(`    VALUES ('${userId}', '${email}', 'Administrateur', 'admin', true);`);
      } else {
        console.log('✅ Profile created');
      }
    }

    console.log(`\n🎉 Admin user created successfully!`);
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`\n📝 Go to /login/admin and try to login now!`);

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

main();
