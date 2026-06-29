// ═══════════════════════════════════════════════════════════════
// Argent Clair — Netlify Function : Vérification code Premium
// Endpoint : POST /.netlify/functions/verify-premium
//
// Variables d'environnement requises (Netlify dashboard) :
//   SUPABASE_URL   → URL de votre projet Supabase
//   SUPABASE_KEY   → clé service_role de Supabase (secrète)
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Appel à l'API REST Supabase
async function supabase(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        method === 'POST' ? 'return=representation' : 'return=minimal',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 204) {
    const err = await res.text();
    throw new Error(`Supabase ${method} ${path} → ${res.status}: ${err}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

exports.handler = async (event) => {
  // ── CORS ──
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ── Validation de la requête ──
  let code, deviceHash;
  try {
    const body = JSON.parse(event.body || '{}');
    code       = (body.code || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    deviceHash = (body.device || '').trim().slice(0, 64);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  // Format : XXXX-XXXX-XXXX
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ valid: false, reason: 'FORMAT_INVALIDE' }),
    };
  }

  if (!deviceHash) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ valid: false, reason: 'DEVICE_MANQUANT' }),
    };
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Variables d\'environnement Supabase manquantes');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Configuration serveur incorrecte' }) };
  }

  try {
    // ── 1. Chercher le code dans Supabase ──
    const rows = await supabase(
      'GET',
      `premium_codes?code=eq.${encodeURIComponent(code)}&select=*&limit=1`
    );

    // Code inexistant
    if (!rows || rows.length === 0) {
      // Incrémenter le compteur de tentatives échouées (anti-brute-force)
      await supabase('POST', 'failed_attempts', {
        code_tried:  code,
        device_hash: deviceHash,
        attempted_at: new Date().toISOString(),
      }).catch(() => {}); // Silencieux si la table n'existe pas encore

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ valid: false, reason: 'CODE_INVALIDE' }),
      };
    }

    const row = rows[0];

    // ── 2. Code déjà utilisé ──
    if (row.used) {
      // Même appareil = déjà activé ici → ok (réinstallation)
      if (row.device_hash === deviceHash) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ valid: true, reason: 'DEJA_ACTIVE_CET_APPAREIL' }),
        };
      }
      // Appareil différent = tentative de partage
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ valid: false, reason: 'CODE_DEJA_UTILISE' }),
      };
    }

    // ── 3. Code valide et non utilisé → activer ──
    await supabase(
      'PATCH',
      `premium_codes?code=eq.${encodeURIComponent(code)}`,
      {
        used:         true,
        device_hash:  deviceHash,
        activated_at: new Date().toISOString(),
      }
    );

    console.log(`✅ Code activé : ${code.slice(0,4)}-****-**** | device: ${deviceHash.slice(0,8)}...`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ valid: true, reason: 'ACTIVE' }),
    };

  } catch (err) {
    console.error('Erreur serveur:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erreur serveur temporaire. Réessayez.' }),
    };
  }
};
