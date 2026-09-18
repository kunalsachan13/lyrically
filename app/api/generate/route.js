const PRIMARY_API_BASE = process.env.KRISHNA_API_BASE || 'https://final-8ft2.onrender.com/v1';
const PRIMARY_API_KEY = process.env.KRISHNA_API_KEY;
const PRIMARY_MODEL = process.env.KRISHNA_MODEL || 'fable-5.1';

// OmniRoute (CheaperInference) Provider
const OMNIROUTE_API_BASE = process.env.OMNIROUTE_API_BASE || 'https://api.cheaperinference.com/v1';
const OMNIROUTE_API_KEY = process.env.OMNIROUTE_API_KEY;
const OMNIROUTE_MODEL = process.env.OMNIROUTE_MODEL || 'claude-fable-5.1';

// High-availability zero-config backup endpoint
const BUILTIN_FALLBACK_BASE = 'https://text.pollinations.ai/openai';
const BUILTIN_FALLBACK_MODEL = 'openai';

async function requestCompletion({ apiBase, apiKey, model, prompt, timeoutMs = 28000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const res = await fetch(`${apiBase.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.85,
      }),
      signal: controller.signal,
    });

    const rawResponse = await res.text();
    let data;
    try {
      data = JSON.parse(rawResponse);
    } catch {
      throw new Error(`Server returned HTTP ${res.status} (non-JSON response)`);
    }

    if (!res.ok) {
      throw new Error(data.error?.message || `HTTP ${res.status}: ${res.statusText}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response received from AI model');
    }

    return content;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req) {
  const {
    artist,
    style,
    brief,
    language = 'English',
    customFallbackBase,
    customFallbackKey,
    customFallbackModel,
    forceProvider,
  } = await req.json();

  if (!artist || !brief) {
    return Response.json({ error: 'Artist and description required' }, { status: 400 });
  }

  const prompt = `You are a professional songwriter. Write original song lyrics in the style of ${artist}.

TARGET LYRICS LANGUAGE:
${language || 'English'}
(Important: Write the lyrics authentically in ${language || 'English'}. Match native idioms, poetic rhyme schemes, rhythm, and cadence. If romanized or hybrid script like Hinglish, Romaji, or Romanized Korean is specified, write using natural, easily singable phrasing.)

ARTIST STYLE PROFILE:
${style || `Use your knowledge of ${artist}'s known style, themes, and vocabulary.`}

SONG BRIEF:
${brief}

OUTPUT FORMAT (follow exactly):

TAGS:
#tag1 #tag2 #tag3 #tag4 #tag5 #tag6 #tag7 (5 to 8 relevant hashtags covering genre, vibe, and themes)

CAPTION:
[A punchy 1-2 sentence teaser caption with emojis and lyrics quote for TikTok, Reels, YouTube Shorts, or Spotify Canvas release]

STYLE PROMPT:
[one paragraph: genre, mood, BPM, instruments, vocal style]

LYRICS:
[Verse]
...
[Chorus]
...
[Verse]
...
[Chorus]
...
[Bridge]
...
[Outro]
...

Write original lyrics only. Do not copy any existing song.`;

  const errors = [];

  // Step 1: Attempt Primary Provider (Render) unless client forced fallback
  if (forceProvider !== 'fallback') {
    try {
      const text = await requestCompletion({
        apiBase: PRIMARY_API_BASE,
        apiKey: PRIMARY_API_KEY,
        model: PRIMARY_MODEL,
        prompt,
        timeoutMs: 7000,
      });

      return Response.json({
        text,
        provider: 'Render Primary',
        fallbackTriggered: false,
      });
    } catch (e) {
      errors.push(`Primary (${PRIMARY_API_BASE}): ${e.message}`);
    }
  }

  // Step 2: Attempt OmniRoute Provider if configured
  const omniKey = customFallbackKey?.startsWith('ci_live_') ? customFallbackKey : OMNIROUTE_API_KEY;
  if (omniKey) {
    try {
      const text = await requestCompletion({
        apiBase: OMNIROUTE_API_BASE,
        apiKey: omniKey,
        model: customFallbackModel || OMNIROUTE_MODEL,
        prompt,
        timeoutMs: 25000,
      });

      return Response.json({
        text,
        provider: `OmniRoute (${customFallbackModel || OMNIROUTE_MODEL})`,
        fallbackTriggered: true,
        primaryNotice: 'Render service was unavailable. Automatically routed via OmniRoute.',
      });
    } catch (e) {
      errors.push(`OmniRoute (${OMNIROUTE_MODEL}): ${e.message}`);
    }
  }

  // Step 3: Attempt Custom Fallback Provider (if configured in env or UI settings)
  const fallbackBase = customFallbackBase || process.env.FALLBACK_API_BASE;
  const fallbackKey = customFallbackKey || process.env.FALLBACK_API_KEY;
  const fallbackModel = customFallbackModel || process.env.FALLBACK_MODEL || 'gpt-4o-mini';

  if (fallbackBase) {
    try {
      const text = await requestCompletion({
        apiBase: fallbackBase,
        apiKey: fallbackKey,
        model: fallbackModel,
        prompt,
        timeoutMs: 25000,
      });

      return Response.json({
        text,
        provider: 'Custom Fallback API',
        fallbackTriggered: true,
        primaryNotice: 'Primary Render service unavailable. Switched to configured fallback API.',
        errors,
      });
    } catch (e) {
      errors.push(`Custom Fallback (${fallbackBase}): ${e.message}`);
    }
  }

  // Step 3: Attempt Built-in High-Availability Fallback (Pollinations AI)
  try {
    const text = await requestCompletion({
      apiBase: BUILTIN_FALLBACK_BASE,
      apiKey: null,
      model: BUILTIN_FALLBACK_MODEL,
      prompt,
      timeoutMs: 30000,
    });

    return Response.json({
      text,
      provider: 'Auto-Fallback (High-Availability)',
      fallbackTriggered: true,
      primaryNotice: 'Render primary server was unavailable or suspended. Automatically switched to high-availability backup provider.',
      errors,
    });
  } catch (e) {
    errors.push(`Auto-Fallback (${BUILTIN_FALLBACK_BASE}): ${e.message}`);
  }

  // If all providers failed
  return Response.json(
    {
      error: 'All AI providers are currently unavailable.',
      details: errors,
    },
    { status: 503 }
  );
}