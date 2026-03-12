import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

function getAdmin() {
  if (!supabaseUrl || !serviceKey) {
    throw new Deno.errors.NotSupported('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — skipping')
  }
  return createClient(supabaseUrl, serviceKey)
}

Deno.test({
  name: 'has_min_global_role returns false for non-existent user',
  ignore: !supabaseUrl || !serviceKey,
  fn: async () => {
    const admin = getAdmin()
    const { data, error } = await admin.rpc('has_min_global_role', {
      _user_id: '00000000-0000-0000-0000-000000000000',
      _min_level: 1,
    })
    assertEquals(error, null)
    assertEquals(data, false)
  },
})

Deno.test({
  name: 'service_role can read profiles',
  ignore: !supabaseUrl || !serviceKey,
  fn: async () => {
    const admin = getAdmin()
    const { error } = await admin.from('profiles').select('id, global_role').limit(1)
    assertEquals(error, null)
  },
})

Deno.test({
  name: 'has_min_global_role returns false for level 5 on fake user',
  ignore: !supabaseUrl || !serviceKey,
  fn: async () => {
    const admin = getAdmin()
    const { data, error } = await admin.rpc('has_min_global_role', {
      _user_id: '00000000-0000-0000-0000-000000000000',
      _min_level: 5,
    })
    assertEquals(error, null)
    assertEquals(data, false)
  },
})
