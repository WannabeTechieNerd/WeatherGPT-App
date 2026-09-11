import { Language } from '../types';

let audioCtx: AudioContext | null = null;
let currentSourceNode: AudioBufferSourceNode | null = null;
let currentGainNode: GainNode | null = null;
let isBufferPlaying = false;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let activeAudioElement: HTMLAudioElement | null = null;
let isAudioMuted = false;
const activeUtterances = new Set<SpeechSynthesisUtterance>();

// Silent base64 audio snippet used for legacy mobile element priming
const SILENT_AUDIO_DATA =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

// Safe AudioContext getter with mobile touch unlock
export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass({ latencyHint: 'interactive' });
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } catch (e) {
    console.warn('AudioContext initialization failed:', e);
  }
  return audioCtx;
}

// Global HTMLAudioElement getter as backup
export function getOrCreateAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!activeAudioElement) {
    try {
      activeAudioElement = new Audio();
      activeAudioElement.preload = 'auto';
    } catch (e) {
      console.warn('HTMLAudioElement init error:', e);
    }
  }
  return activeAudioElement;
}

// User-gesture unlocker (invoked on touchstart, click, pointerdown to unlock Android OS audio pipeline)
export function unlockAudio(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  // 1. Unlock Web Audio Context & play silent buffer to claim hardware audio routing
  const ctx = getAudioContext();
  let ctxPromise: Promise<void> = Promise.resolve();
  if (ctx) {
    if (ctx.state === 'suspended') {
      ctxPromise = ctx.resume().catch(() => {});
    }
    ctxPromise = ctxPromise.then(() => {
      try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch {}
    });
  }

  // 2. Pre-authorize HTMLAudioElement for Android PWAs / Mobile Chrome
  const el = getOrCreateAudioElement();
  if (el && (!el.src || el.src.startsWith('data:'))) {
    try {
      el.src = SILENT_AUDIO_DATA;
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } catch {}
  }

  // 3. Prime Web SpeechSynthesis for Android
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.resume();
      const prime = new SpeechSynthesisUtterance('');
      prime.volume = 0;
      window.speechSynthesis.speak(prime);
    } catch {}
  }

  return ctxPromise.then(() => true).catch(() => false);
}

// Play synthesizer feedback chimes (verifies device speaker is functional)
export function playChime(type: 'message' | 'mic_start' | 'mic_stop' | 'toggle' | 'test') {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'message') {
      // Warm welcoming two-tone chime (523Hz C5 -> 659Hz E5)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
      osc.start(now);
      osc.stop(now + 0.38);
    } else if (type === 'test') {
      // Harmonic triple chime for speaker testing (440Hz -> 554Hz -> 659Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(554.37, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.2);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === 'mic_start') {
      // Upward prompt (440Hz -> 880Hz)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'mic_stop') {
      // Gentle confirmation
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      // Quick click chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch (e) {
    console.warn('Chime audio error:', e);
  }
}

// Language code map for SpeechSynthesis & SpeechRecognition
const langCodeMap: Record<Language, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  bn: 'bn-IN',
  te: 'te-IN',
  ta: 'ta-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ar: 'ar-SA',
  ru: 'ru-RU',
  pt: 'pt-BR',
};

export function setAudioMuted(muted: boolean) {
  isAudioMuted = muted;
  if (muted) {
    stopSpeaking();
  } else {
    playChime('toggle');
  }
}

export function getAudioMuted(): boolean {
  return isAudioMuted;
}

// Stop current speech across Web Audio, HTMLAudio, and SpeechSynthesis
export function stopSpeaking() {
  isBufferPlaying = false;

  // Stop Web Audio node
  if (currentSourceNode) {
    try {
      currentSourceNode.stop();
      currentSourceNode.disconnect();
    } catch {}
    currentSourceNode = null;
  }
  if (currentGainNode) {
    try {
      currentGainNode.disconnect();
    } catch {}
    currentGainNode = null;
  }

  // Stop HTMLAudio
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch {}
  }

  // Stop SpeechSynthesis
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }

  currentUtterance = null;
  activeUtterances.clear();
}

// Check if audio is currently playing
export function isCurrentlySpeaking(): boolean {
  if (isBufferPlaying) return true;
  if (activeAudioElement && !activeAudioElement.paused && activeAudioElement.currentTime > 0) {
    return true;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const pureBase64 = base64.replace(/^data:audio\/[a-z0-9]+;base64,/i, '');
  const binaryString = atob(pureBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function playBase64Audio(
  base64Data: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
): Promise<boolean> {
  if (isAudioMuted || typeof window === 'undefined') {
    if (onEnd) onEnd();
    return false;
  }

  stopSpeaking();

  const ctx = getAudioContext();
  if (ctx) {
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }

      const arrayBuffer = base64ToArrayBuffer(base64Data);

      const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
        try {
          const promiseOrVoid = ctx.decodeAudioData(
            arrayBuffer.slice(0),
            (decoded) => resolve(decoded),
            (err) => reject(err)
          );
          if (promiseOrVoid && typeof (promiseOrVoid as any).then === 'function') {
            (promiseOrVoid as any).then(resolve).catch(reject);
          }
        } catch (e) {
          reject(e);
        }
      });

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(1.0, ctx.currentTime);
      source.connect(gain);
      gain.connect(ctx.destination);

      currentSourceNode = source;
      currentGainNode = gain;
      isBufferPlaying = true;

      source.onended = () => {
        if (currentSourceNode === source) {
          currentSourceNode = null;
          isBufferPlaying = false;
        }
        if (onEnd) onEnd();
      };

      if (onStart) onStart();
      source.start(0);
      return true;
    } catch (webAudioErr) {
      console.warn('Web Audio base64 decode failed, falling back to HTMLAudio:', webAudioErr);
    }
  }

  // HTML5 Audio fallback for base64 URI
  try {
    const audioEl = getOrCreateAudioElement();
    if (audioEl) {
      audioEl.src = base64Data;
      audioEl.volume = 1.0;

      const cleanup = () => {
        audioEl.removeEventListener('ended', handleEnded);
        audioEl.removeEventListener('error', handleError);
      };

      const handleEnded = () => {
        cleanup();
        isBufferPlaying = false;
        if (onEnd) onEnd();
      };

      const handleError = (e: any) => {
        cleanup();
        isBufferPlaying = false;
        if (onError) onError(e);
        if (onEnd) onEnd();
      };

      audioEl.addEventListener('ended', handleEnded, { once: true });
      audioEl.addEventListener('error', handleError, { once: true });

      const playPromise = audioEl.play();
      if (playPromise !== undefined) {
        await playPromise;
        isBufferPlaying = true;
        if (onStart) onStart();
        return true;
      }
    }
  } catch (htmlAudioErr) {
    console.warn('HTMLAudio base64 playback failed:', htmlAudioErr);
    if (onError) onError(htmlAudioErr);
    if (onEnd) onEnd();
  }

  return false;
}

// Speak text using Web Audio API buffer decoding, base64 payload, or native SpeechSynthesis
export async function speakText(
  text: string,
  lang: Language,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void,
  audioBase64?: string
): Promise<void> {
  if (isAudioMuted || typeof window === 'undefined') {
    if (onEnd) onEnd();
    return;
  }

  stopSpeaking();

  // Clean text: strip markdown asterisks, hashes, backticks for smooth spoken audio
  const cleanText = text
    .replace(/[*_#`~[\]()]/g, '')
    .replace(/\b(\d+)\s*°[cC]\b/g, '$1 degrees celsius')
    .replace(/\b(\d+)\s*°[fF]\b/g, '$1 degrees fahrenheit')
    .replace(/\b(\d+)\s*°\b/g, '$1 degrees')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) {
    if (onEnd) onEnd();
    return;
  }

  // Ensure AudioContext is ready and resumed
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (e) {
      console.warn('Could not resume audio context:', e);
    }
  }

  // ATTEMPT 1: If precomputed audioBase64 is passed (zero-latency instant playback)
  if (audioBase64) {
    const success = await playBase64Audio(audioBase64, onStart, onEnd, onError);
    if (success) return;
  }

  // ATTEMPT 2: Request audioBase64 from server via POST /api/ai/tts (immune to proxy/redirect bugs)
  try {
    const res = await fetch('/api/ai/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, lang }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.audioBase64) {
        const success = await playBase64Audio(data.audioBase64, onStart, onEnd, onError);
        if (success) return;
      }
    }
  } catch (ttsErr) {
    console.warn('POST /api/ai/tts error, using speech synthesis fallback:', ttsErr);
  }

  // ATTEMPT 3: Direct Web SpeechSynthesis fallback (synchronous invocation keeps user activation alive)
  return fallbackSpeechSynthesis(cleanText, lang, onStart, onEnd, onError);
}

// Fallback SpeechSynthesis with Android Chromium bug fixes applied
function fallbackSpeechSynthesis(
  cleanText: string,
  lang: Language,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      resolve();
      return;
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const langCode = langCodeMap[lang] || 'en-US';
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = langCode;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      activeUtterances.add(utterance);
      currentUtterance = utterance;

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const langPrefix = langCode.split('-')[0].toLowerCase();
        const voice =
          voices.find((v) => v.lang.toLowerCase() === langCode.toLowerCase()) ||
          voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith(langPrefix));
        if (voice) {
          utterance.voice = voice;
        }
      }

      utterance.onstart = () => {
        if (onStart) onStart();
      };

      utterance.onend = () => {
        activeUtterances.delete(utterance);
        currentUtterance = null;
        if (onEnd) onEnd();
        resolve();
      };

      utterance.onerror = (event) => {
        activeUtterances.delete(utterance);
        currentUtterance = null;
        console.warn('SpeechSynthesis error:', event);
        if (onError) onError(event);
        if (onEnd) onEnd();
        resolve();
      };

      window.speechSynthesis.speak(utterance);

      const resumeInterval = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(resumeInterval);
        } else {
          window.speechSynthesis.resume();
        }
      }, 2500);
    } catch (err) {
      console.warn('SpeechSynthesis setup error:', err);
      if (onError) onError(err);
      if (onEnd) onEnd();
      resolve();
    }
  });
}

// Voice recognition for user speech input (Microphone)
export function createSpeechRecognizer(
  lang: Language,
  onResult: (transcript: string) => void,
  onEnd: () => void,
  onError: (err: any) => void
): { start: () => void; stop: () => void } | null {
  if (typeof window === 'undefined') return null;

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return null;
  }

  try {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = langCodeMap[lang] || 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript) {
        onResult(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      onError(event);
    };

    recognition.onend = () => {
      onEnd();
    };

    return {
      start: () => {
        try {
          recognition.start();
        } catch (e) {
          console.warn('Recognition start error:', e);
        }
      },
      stop: () => {
        try {
          recognition.stop();
        } catch (e) {}
      },
    };
  } catch (err) {
    console.warn('Error creating recognizer:', err);
    return null;
  }
}
