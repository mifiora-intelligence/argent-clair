// ═══════════════════════════════════════════════════════════════
// Argent Clair — Netlify Function : Dashboard admin codes
// Endpoint : POST /.netlify/functions/admin-codes
//
// Actions disponibles : list | revoke | stats
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

async function supabase(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        method === 'PATCH' ? 'return=minimal' : 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 204) {
    const err = await res.text();
    throw new Error(`Supabase ${res.status}: ${err}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: '{}' };

  let secret, action, code;
  try {
    const body = JSON.parse(event.body || '{}');
    secret = body.secret || '';
    action = body.action || 'list';
    code   = (body.code || '').toUpperCase().trim();
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Requête invalide' }) };
  }

  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non autorisé' }) };
  }

  try {
    if (action === 'list') {
      // Tous les codes triés par date de création
      const rows = await supabase('GET',
        'premium_codes?select=*&order=created_at.desc&limit=200'
      );
      return { statusCode: 200, headers, body: JSON.stringify({ codes: rows || [] }) };
    }

    if (action === 'stats') {
      const all      = await supabase('GET', 'premium_codes?select=used');
      const total    = all ? all.length : 0;
      const used     = all ? all.filter(r => r.used).length : 0;
      const available = total - used;
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ total, used, available, revenue_fcfa: used * 5000 }),
      };
    }

    if (action === 'revoke') {
      if (!code) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Code requis' }) };
      await supabase('PATCH',
        `premium_codes?code=eq.${encodeURIComponent(code)}`,
        { revoked: true, revoked_at: new Date().toISOString() }
      );
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, revoked: code }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Action inconnue' }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
