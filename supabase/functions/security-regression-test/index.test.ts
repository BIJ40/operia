import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const admin = createClient(supabaseUrl, serviceKey)

Deno.test('has_min_global_role returns false for non-existent user', async () => {
  const { data, error } = await admin.rpc('has_min_global_role', {
    _user_id: '00000000-0000-0000-0000-000000000000',
    _min_level: 1,
  })
  assertEquals(error, null)
  assertEquals(data, false)
})

Deno.test('service_role can read profiles without error', async () => {
  const { error } = await admin.from('profiles').select('id, global_role').limit(1)
  assertEquals(error, null)
})

Deno.test('has_min_global_role returns false for level 5 on non-existent user', async () => {
  const { data, error } = await admin.rpc('has_min_global_role', {
    _user_id: '00000000-0000-0000-0000-000000000000',
    _min_level: 5,
  })
  assertEquals(error, null)
  assertEquals(data, false)
})
