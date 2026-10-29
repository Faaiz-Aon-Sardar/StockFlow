import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eolznmdhlinycoguyztr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__iJu5msLn9h6bRWwaZf5Tw_pUlLia0O';

async function verify() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('1. Signing in with demo credentials...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'demo.stockflow@gmail.com',
    password: 'Demo@123456'
  });

  if (authError) {
    console.error('Sign-in error:', authError);
    process.exit(1);
  }
  console.log('Signed in successfully as:', authData.user.email);
  console.log('User ID:', authData.user.id);

  console.log('\n2. Querying user businesses & membership...');
  const { data: members, error: memError } = await supabase
    .from('business_members')
    .select('role, business:businesses(*)');
  if (memError) throw memError;
  console.log('Business membership:', JSON.stringify(members, null, 2));

  console.log('\n3. Querying products catalog...');
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, sku, name, default_selling_price, uom');
  if (prodError) throw prodError;
  console.log(`Found ${products.length} products:`, products.map(p => `${p.sku} - ${p.name} (₹${p.default_selling_price}/${p.uom})`));

  console.log('\n4. Querying commercial parties...');
  const { data: parties, error: partyError } = await supabase
    .from('parties')
    .select('id, code, name, party_type, phone');
  if (partyError) throw partyError;
  console.log(`Found ${parties.length} parties:`, parties.map(p => `[${p.party_type}] ${p.code} - ${p.name}`));

  console.log('\n5. Querying stock movements ledger...');
  const { data: movements, error: movError } = await supabase
    .from('stock_movements')
    .select('movement_type, change_qty, reason');
  if (movError) throw movError;
  console.log(`Found ${movements.length} inventory movements:`, movements);

  console.log('\nALL CHECKS PASSED PERFECTLY!');
}

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
