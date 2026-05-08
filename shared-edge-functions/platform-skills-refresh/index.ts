// platform-skills-refresh — generates the two skill markdown files and uploads them to platform-docs.
// Triggered by cron `platform-skills-refresh-daily` at 0 10 * * * UTC, or manually via token.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SHARED_TOKEN = 'st-skills-refresh-2026-9k4m';

const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? req.headers.get('x-sync-token');
  if (token !== SHARED_TOKEN) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }

  const results: Record<string, any> = {};

  try {
    const { data: stateMd, error: stateErr } = await sb.rpc('fn_generate_platform_state_snapshot');
    if (stateErr) throw stateErr;
    const stateBytes = new TextEncoder().encode(stateMd as string);
    const { error: stateUploadErr } = await sb.storage
      .from('platform-docs')
      .upload('skills/platform-state-snapshot.md', stateBytes, {
        contentType: 'text/markdown', upsert: true,
      });
    if (stateUploadErr) throw stateUploadErr;
    results.state_snapshot = { ok: true, bytes: stateBytes.length };
  } catch (e) {
    results.state_snapshot = { ok: false, error: String(e) };
  }

  try {
    const { data: schemaMd, error: schemaErr } = await sb.rpc('fn_generate_schema_cheatsheet');
    if (schemaErr) throw schemaErr;
    const schemaBytes = new TextEncoder().encode(schemaMd as string);
    const { error: schemaUploadErr } = await sb.storage
      .from('platform-docs')
      .upload('skills/schema-cheatsheet.md', schemaBytes, {
        contentType: 'text/markdown', upsert: true,
      });
    if (schemaUploadErr) throw schemaUploadErr;
    results.schema_cheatsheet = { ok: true, bytes: schemaBytes.length };
  } catch (e) {
    results.schema_cheatsheet = { ok: false, error: String(e) };
  }

  return new Response(JSON.stringify({
    ok: results.state_snapshot?.ok && results.schema_cheatsheet?.ok,
    refreshed_at: new Date().toISOString(),
    results,
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
});
