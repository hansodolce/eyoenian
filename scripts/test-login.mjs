// Test login and show full error response
const supabaseUrl = process.env.VITE_SUPABASE_URL;

async function main() {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': process.env.VITE_SUPABASE_ANON_KEY },
    body: JSON.stringify({ email: 'admin@eyoenian.com', password: 'Admin@12345678' })
  });
  const body = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(body, null, 2));
}

main();
