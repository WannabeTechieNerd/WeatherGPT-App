import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import {generateWeatherVoiceResponse} from './src/utils/weatherSynthesis';

dotenv.config();

const GROQ_CANDIDATE_MODELS = [
  'qwen/qwen3.8-27b',
  'groq/compound-mini',
  'qwen/qwen3.6-27b',
];

let groqClient: Groq | null = null;
function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!groqClient) {
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

function aiApiPlugin(): Plugin {
  return {
    name: 'vite-plugin-ai-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/health') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
          return;
        }

        if (req.url === '/api/ai/assistant' && req.method === 'POST') {
          const chunks: any[] = [];
          req.on('data', (chunk) => {
            chunks.push(chunk);
          });

          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');
            try {
              const rawBody = Buffer.concat(chunks).toString('utf-8');
              const { message, weatherData, language = 'en' } = JSON.parse(rawBody || '{}');

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
You are providing spoken answers directly to users on mobile and web.
Current location weather context provided:
${JSON.stringify(weatherData || {})}

TARGET LANGUAGE: ${targetLanguage}
INSTRUCTIONS:
1. You MUST respond completely in ${targetLanguage}. Use authentic native script (e.g. Devanagari for Hindi/Marathi, Bengali script for Bengali, Telugu script for Telugu, Tamil script for Tamil, Gujarati script for Gujarati, Kannada script for Kannada, Malayalam script for Malayalam, Gurmukhi for Punjabi) with natural local phrasing.
2. Keep your answer conversational, punchy, and helpful (2 to 3 sentences maximum) because it will be spoken aloud to the user via speech synthesis.
3. Reference real temperatures, rain probabilities, or climate data from the context if relevant.
4. Do not include markdown bullet points, asterisks, or hashtag symbols so it reads aloud cleanly. Speak in natural fluent spoken sentences.`;

              const groq = getGroqClient();
              let replyText: string | null = null;

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
                        break; // Succeeded with Groq
                      }
                    }
                  } catch {
                    // Try next Groq model
                  }
                }
              }

              // Intelligent localized fallback when API key is not configured or all models are rate-limited
              if (!replyText) {
                replyText = generateWeatherVoiceResponse(message, weatherData, language);
              }

              res.end(JSON.stringify({ reply: replyText }));
            } catch (error: any) {
              const fallback = generateWeatherVoiceResponse('', undefined, 'en');
              res.end(JSON.stringify({ reply: fallback }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

// LINT.IfChange(aistudio_media_plugin)
function aistudioMediaPlugin(): Plugin {
  return {
    name: 'vite-plugin-aistudio-media',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/assets/aistudio/')) {
          const rawPath = req.url.split('?')[0].split('#')[0];
          try {
            const decodedPath = decodeURIComponent(rawPath);
            const relativePath = decodedPath.replace(/^\//, '');
            const aistudioDir = path.resolve(
              __dirname,
              'public',
              'assets',
              'aistudio',
            );
            const filePath = path.resolve(__dirname, 'public', relativePath);
            if (
              filePath.startsWith(aistudioDir + path.sep) &&
              fs.existsSync(filePath) &&
              fs.statSync(filePath).isFile()
            ) {
              const ext = path.extname(filePath).toLowerCase();
              const mimeMap: Record<string, string> = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.bmp': 'image/bmp',
                '.ico': 'image/x-icon',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.ogv': 'video/ogg',
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.ogg': 'audio/ogg',
                '.pdf': 'application/pdf',
              };
              res.setHeader(
                'Content-Type',
                mimeMap[ext] || 'application/octet-stream',
              );
              res.setHeader('Cache-Control', 'no-cache');
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          } catch {
            // Fall through if URI decoding or file access fails
          }
        }
        next();
      });
    },
  };
}
// LINT.ThenChange(//depot/google3/java/com/google/alkali/boq/makersuite/applet_dev_service/templates/initializers/react_theme/vite.config.ts:aistudio_media_plugin)

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), aistudioMediaPlugin(), aiApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
