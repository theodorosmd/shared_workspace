import { supabase } from '@/lib/supabase'

export async function logAction(
  action: string,
  entityType: string,
  entityId?: string,
  entityName?: string,
  metadata?: Record<string, unknown>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('audit_logs').insert({
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      entity_name: entityName ?? null,
      actor_id: user?.id ?? null,
      actor_email: user?.email ?? null,
      metadata: metadata ?? {},
    })
  } catch (_e) { /* fire-and-forget */ }
}
