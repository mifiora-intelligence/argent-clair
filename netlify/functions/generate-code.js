// ═══════════════════════════════════════════════════════════════
// Argent Clair — Netlify Function : Génération de codes Premium
// Endpoint : POST /.netlify/functions/generate-code
//
// ⚠️ USAGE INTERNE UNIQUEMENT — protégé par ADMIN_SECRET
//
// Variables d'environnement requises :
//   SUPABASE_URL   → URL de votre projet Supabase
//   SUPABASE_KEY   → clé service_role Supabase
//   ADMIN_SECRET   → mot de passe secret pour protéger cet endpoint
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL   = process.env.SUPABASE_URL;
const SUPABASE_KEY   = process.env.SUPABASE_KEY;
const ADMIN_SECRET   = process.env.ADMIN_SECRET;

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sans I, O, 1, 0

function randomCode() {
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i === 4 || i === 8) code += '-';
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code; // Format : XXXX-XXXX-XXXX
}

async function supabase(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${res.status}: ${err}`);
  }
  return res.json();
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ── Authentification admin ──
  let secret, clientNote, quantity;
  try {
    const body   = JSON.parse(event.body || '{}');
    secret       = body.secret || '';
    clientNote   = (body.note || 'Client').slice(0, 100);
    quantity     = Math.min(parseInt(body.quantity || '1', 10), 50);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Requête invalide' }) };
  }

  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non autorisé' }) };
  }

  try {
    const codes = [];

    for (let i = 0; i < quantity; i++) {
      let code, exists = true;

      // S'assurer que le code n'existe pas déjà
      let attempts = 0;
      while (exists && attempts < 10) {
        code   = randomCode();
        const rows = await supabase('GET',
          `premium_codes?code=eq.${encodeURIComponent(code)}&select=code&limit=1`
        );
        exists = rows && rows.length > 0;
        attempts++;
      }

      // Insérer dans Supabase
      const result = await supabase('POST', 'premium_codes', {
        code,
        used:        false,
        note:        clientNote,
        created_at:  new Date().toISOString(),
        device_hash: null,
        activated_at: null,
      });

      codes.push({ code, note: clientNote });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        generated: codes.length,
        codes,
        message: `${codes.length} code(s) généré(s) et enregistré(s) dans la base.`,
      }),
    };

  } catch (err) {
    console.error('Erreur génération:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erreur serveur: ' + err.message }),
    };
  }
};
