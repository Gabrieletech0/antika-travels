// Vercel Serverless Function — Newsletter Brevo
// BREVO_API_KEY va aggiunta come variabile d'ambiente su Vercel

// Rate limiting in-memory (reset ad ogni cold start)
const rateMap = new Map();
const RATE_LIMIT = 5; // max richieste per IP
const RATE_WINDOW = 60000; // 1 minuto

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limiting per IP
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_WINDOW) { entry.count = 0; entry.start = now; }
  entry.count++;
  rateMap.set(ip, entry);
  if (entry.count > RATE_LIMIT) return res.status(429).json({ error: 'Troppe richieste. Riprova tra un minuto.' });

  const { nome, email, source } = req.body;

  // Validazione email
  if (!email) return res.status(400).json({ error: 'Email obbligatoria' });
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || email.length > 254) return res.status(400).json({ error: 'Email non valida' });

  // Sanitizzazione nome
  const cleanNome = (nome || '').replace(/<[^>]*>/g, '').trim().slice(0, 100);

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key non configurata' });

  try {
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'content-type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({ email, attributes: { NOME: cleanNome, SOURCE: source || 'sito' }, listIds: [2], updateEnabled: true })
    });
    if (response.ok || response.status === 204) return res.status(200).json({ success: true });
    const err = await response.json();
    return res.status(response.status).json({ error: err });
  } catch (error) {
    return res.status(500).json({ error: 'Errore di rete' });
  }
}
