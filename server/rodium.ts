const LANG_NAME: Record<string, string> = { fr: 'français', fon: 'fon', goun: 'goun', yoruba: 'yoruba' }

/**
 * Reformule le message d'alerte avec l'IA Rodium (API compatible OpenAI : /chat/completions).
 * En cas d'absence de clé ou d'erreur, on renvoie le texte d'origine : une alerte ne doit jamais être bloquée.
 */
export async function polish(text: string, lang: string, firstName: string): Promise<string> {
  const { RODIUM_API_KEY, RODIUM_API_URL, RODIUM_MODEL } = process.env
  if (!RODIUM_API_KEY || RODIUM_API_KEY.includes('REMPLACER') || !RODIUM_API_URL) return text
  try {
    const res = await fetch(`${RODIUM_API_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${RODIUM_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: RODIUM_MODEL,
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content:
              'Tu rédiges des alertes WhatsApp sur l’eau potable pour des familles d’Abomey-Calavi (Bénin). ' +
              'Ton chaleureux, phrases courtes, 400 caractères maximum, un seul emoji 💧 au début. ' +
              'Ne change AUCUN horaire, aucune zone, aucun conseil de sécurité. Réponds uniquement par le message.',
          },
          { role: 'user', content: `Langue : ${LANG_NAME[lang] ?? 'français'}. Destinataire : ${firstName}.\nMessage à reformuler :\n${text}` },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return text
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const out = data.choices?.[0]?.message?.content?.trim()
    return out && out.length <= 900 ? out : text
  } catch {
    return text
  }
}
