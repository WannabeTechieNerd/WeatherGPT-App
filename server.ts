import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import { generateWeatherVoiceResponse } from './src/utils/weatherSynthesis.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Permissive CORS and media headers for Android mobile & PWA
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Lazy-initialized Gemini AI client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

// Lazy-initialized Groq AI client (only if user explicitly provided GROQ_API_KEY)
let groqClient: Groq | null = null;
function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  if (!groqClient) {
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

const GROQ_CANDIDATE_MODELS = [
  'qwen/qwen3.8-27b',
  'groq/compound-mini',
  'qwen/qwen3.6-27b',
];

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const TTS_LANG_MAP: Record<string, string> = {
  en: 'en',
  hi: 'hi',
  bn: 'bn',
  te: 'te',
  ta: 'ta',
  mr: 'mr',
  gu: 'gu',
  kn: 'kn',
  ml: 'ml',
  pa: 'pa',
  es: 'es',
  fr: 'fr',
  de: 'de',
  zh: 'zh',
  ja: 'ja',
  ar: 'ar',
  ru: 'ru',
  pt: 'pt',
};

async function generateTTSAudioBuffer(rawText: string, lang: string): Promise<Buffer | null> {
  try {
    const cleanText = rawText
      .replace(/[*_#`~[\]()]/g, '')
      .replace(/\b(\d+)\s*°[cC]\b/g, '$1 degrees celsius')
      .replace(/\b(\d+)\s*°[fF]\b/g, '$1 degrees fahrenheit')
      .replace(/\b(\d+)\s*°\b/g, '$1 degrees')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return null;

    const targetLang = TTS_LANG_MAP[lang] || 'en';
    const sentences = cleanText.match(/[^.!?।]+[.!?।]+|[^.!?।]+$/g) || [cleanText];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const s of sentences) {
      const trimmed = s.trim();
      if (!trimmed) continue;
      if ((currentChunk + ' ' + trimmed).trim().length <= 160) {
        currentChunk = currentChunk ? `${currentChunk} ${trimmed}` : trimmed;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        if (trimmed.length > 160) {
          const words = trimmed.split(' ');
          let sub = '';
          for (const w of words) {
            if ((sub + ' ' + w).trim().length <= 160) {
              sub = sub ? `${sub} ${w}` : w;
            } else {
              if (sub) chunks.push(sub);
              sub = w;
            }
          }
          if (sub) chunks.push(sub);
          currentChunk = '';
        } else {
          currentChunk = trimmed;
        }
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    const finalChunks = chunks.slice(0, 4);
    const buffers: Buffer[] = [];

    for (const chunk of finalChunks) {
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(targetLang)}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
      const audioRes = await fetch(ttsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
          'Referer': 'https://translate.google.com/',
        },
      });

      if (audioRes.ok) {
        const ab = await audioRes.arrayBuffer();
        buffers.push(Buffer.from(ab));
      }
    }

    if (buffers.length === 0) return null;
    return Buffer.concat(buffers);
  } catch (err) {
    console.warn('generateTTSAudioBuffer error:', err);
    return null;
  }
}

async function generateTTSAudioBase64(rawText: string, lang: string): Promise<string | null> {
  const buf = await generateTTSAudioBuffer(rawText, lang);
  if (!buf) return null;
  return `data:audio/mp3;base64,${buf.toString('base64')}`;
}

// Android & Mobile PWA Compatible Audio TTS Endpoint (Supports GET binary and POST JSON base64)
app.all('/api/ai/tts', async (req: Request, res: Response) => {
  try {
    const rawText = ((req.method === 'POST' ? req.body?.text : req.query.text) as string || '').trim();
    const lang = ((req.method === 'POST' ? req.body?.lang : req.query.lang) as string || 'en').trim();
    const wantsJson =
      req.method === 'POST' ||
      req.query.format === 'json' ||
      req.headers.accept?.includes('application/json');

    if (!rawText) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (wantsJson) {
      const audioBase64 = await generateTTSAudioBase64(rawText, lang);
      if (!audioBase64) {
        return res.status(502).json({ error: 'Audio generation unavailable' });
      }
      return res.json({ audioBase64 });
    }

    const merged = await generateTTSAudioBuffer(rawText, lang);
    if (!merged) {
      return res.status(502).send('Audio generation unavailable');
    }

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': merged.length.toString(),
      'Cache-Control': 'public, max-age=86400',
      'Accept-Ranges': 'bytes',
    });
    return res.send(merged);
  } catch (err) {
    console.warn('TTS streaming error:', err);
    return res.status(500).send('TTS error');
  }
});

// AI Assistant Endpoint
app.post('/api/ai/assistant', async (req: Request, res: Response) => {
  try {
    const { message, weatherData, language = 'en' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const langNames: Record<string, string> = {
      en: 'English',
      hi: 'Hindi (हिन्दी)',
      bn: 'Bengali (বাংলা)',
      te: 'Telugu (తెలుగు)',
      ta: 'Tamil (தமிழ்)',
      mr: 'Marathi (मराठी)',
      gu: 'Gujarati (ગુજરાતી)',
      kn: 'Kannada (ಕನ್ನಡ)',
      ml: 'Malayalam (മലയാളം)',
      pa: 'Punjabi (ਪੰਜਾਬੀ)',
      es: 'Spanish (Español)',
      fr: 'French (Français)',
      de: 'German (Deutsch)',
      zh: 'Chinese (中文)',
      ja: 'Japanese (日本語)',
      ar: 'Arabic (العربية)',
      ru: 'Russian (Русский)',
      pt: 'Portuguese (Português)',
    };
    const targetLanguage = langNames[language] || language;

    const systemPrompt = `You are "Aero", an expert meteorologist and climate scientist AI voice assistant for the Weather AI application.
You are providing spoken answers to users on mobile and web.
Current location weather context provided:
${JSON.stringify(weatherData || {})}

TARGET LANGUAGE: ${targetLanguage}
INSTRUCTIONS:
1. You MUST respond completely in ${targetLanguage}. Use authentic native script (e.g. Devanagari for Hindi/Marathi, Bengali script for Bengali, Telugu script for Telugu, Tamil script for Tamil, Gujarati script for Gujarati, Kannada script for Kannada, Malayalam script for Malayalam, Gurmukhi for Punjabi) with natural local phrasing.
2. Keep your answer conversational, punchy, and helpful (2 to 3 sentences maximum) because it will be spoken aloud to the user via speech synthesis.
3. Reference real temperatures, rain probabilities, or climate data from the context if relevant.
4. Do NOT include markdown bullet points, asterisks, or hashtags so it reads aloud cleanly. Speak in natural fluent spoken sentences.`;

    let replyText: string | null = null;

    // 1. Try Gemini if GEMINI_API_KEY is configured
    const gemini = getGeminiClient();
    if (gemini) {
      try {
        const response = await gemini.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nCurrent location weather context:\n${JSON.stringify(weatherData || {})}\n\nUser Question: ${message}` }],
            },
          ],
          config: {
            maxOutputTokens: 200,
            temperature: 0.5,
          },
        });
        const text = response.text?.trim();
        if (text) {
          replyText = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        }
      } catch {
        // Seamlessly fall through to next options
      }
    }

    // 2. Try Groq if user explicitly configured GROQ_API_KEY in environment
    if (!replyText) {
      const groq = getGroqClient();
      if (groq) {
        for (const modelName of GROQ_CANDIDATE_MODELS) {
          try {
            const completion = await groq.chat.completions.create({
              model: modelName,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Current location weather context:\n${JSON.stringify(weatherData || {})}\n\nUser Question: ${message}` },
              ],
              temperature: 0.5,
              max_tokens: 200,
            });

            const raw = completion.choices?.[0]?.message?.content?.trim();
            if (raw) {
              const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
              if (cleaned) {
                replyText = cleaned;
                break;
              }
            }
          } catch {
            // Seamlessly try next candidate model
          }
        }
      }
    }

    // 3. Resilient built-in localized meteorological synthesis fallback
    if (!replyText) {
      replyText = generateWeatherVoiceResponse(message, weatherData, language);
    }

    const audioBase64 = await generateTTSAudioBase64(replyText, language);

    return res.json({
      reply: replyText,
      audioBase64,
    });
  } catch (error: any) {
    const fallback = generateWeatherVoiceResponse(req.body?.message || '', req.body?.weatherData, req.body?.language || 'en');
    const audioBase64 = await generateTTSAudioBase64(fallback, req.body?.language || 'en').catch(() => null);
    return res.json({ reply: fallback, audioBase64 });
  }
});

// Vite middleware and static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Weather AI Server running on port ${PORT}`);
  });
}

startServer();
