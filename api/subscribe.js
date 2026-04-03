// Vercel Serverless Function — Newsletter Brevo
// BREVO_API_KEY va aggiunta come variabile d'ambiente su Vercel

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { nome, email, source } = req.body;
  if (!email) return res.status(400).json({ error: 'Email obbligatoria' });
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key non configurata' });
  try {
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'content-type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({ email, attributes: { NOME: nome || '', SOURCE: source || 'sito' }, listIds: [2], updateEnabled: true })
    });
    if (response.ok || response.status === 204) return res.status(200).json({ success: true });
    const err = await response.json();
    return res.status(response.status).json({ error: err });
  } catch (error) {
    return res.status(500).json({ error: 'Errore di rete' });
  }
}
