export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { to, subject, html } = req.body || {}
  if (!to || !subject || !html) return res.status(400).json({ error: 'Missing required fields' })
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return res.status(200).json({ skipped: true })
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Ritsema Training Tracker <onboarding@resend.dev>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    })
    const data = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: data.message })
    return res.status(200).json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
