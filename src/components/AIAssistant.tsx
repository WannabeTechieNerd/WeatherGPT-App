import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Bot,
  User,
  Radio,
  Trash2,
  X,
} from 'lucide-react';
import { ChatMessage, CurrentWeather, CityLocation, Language, TemperatureUnit } from '../types';
import { translations } from '../data/translations';
import { generateWeatherVoiceResponse } from '../utils/weatherSynthesis';
import {
  speakText,
  stopSpeaking,
  playChime,
  unlockAudio,
  getAudioMuted,
  setAudioMuted,
  createSpeechRecognizer,
} from '../utils/audio';

interface AIAssistantProps {
  weather: CurrentWeather;
  city: CityLocation;
  language: Language;
  tempUnit: TemperatureUnit;
  isSpeaking: boolean;
  setIsSpeaking: (speaking: boolean) => void;
  onClose?: () => void;
}

export function AIAssistant({
  weather,
  city,
  language,
  tempUnit,
  isSpeaking,
  setIsSpeaking,
  onClose,
}: AIAssistantProps) {
  const t = translations[language];

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'greeting',
      sender: 'assistant',
      text: t.assistant.greeting,
      timestamp: Date.now(),
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeSpeakingMsgId, setActiveSpeakingMsgId] = useState<string | null>(null);
  const [isMuted, setIsMutedState] = useState(getAudioMuted());

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognizerRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Update greeting on language change and prefetch its voice audio
  useEffect(() => {
    let cancelled = false;
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'greeting') {
        return [
          {
            id: 'greeting',
            sender: 'assistant',
            text: t.assistant.greeting,
            timestamp: Date.now(),
          },
        ];
      }
      return prev;
    });

    // Prefetch audio for instant playback
    fetch('/api/ai/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: t.assistant.greeting, lang: language }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.audioBase64) {
          setMessages((prev) =>
            prev.map((m) => (m.id === 'greeting' ? { ...m, audioBase64: data.audioBase64 } : m))
          );
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [language, t.assistant.greeting]);

  // Initialize Speech Recognizer
  useEffect(() => {
    const rec = createSpeechRecognizer(
      language,
      (transcript) => {
        setInputVal(transcript);
        setIsListening(false);
        playChime('mic_stop');
        // Auto-send voice input
        sendMessage(transcript);
      },
      () => {
        setIsListening(false);
      },
      (err) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      }
    );
    recognizerRef.current = rec;
  }, [language]);

  const handleToggleMute = () => {
    unlockAudio();
    const nextMuted = !isMuted;
    setAudioMuted(nextMuted);
    setIsMutedState(nextMuted);
    if (nextMuted) {
      stopSpeaking();
      setIsSpeaking(false);
      setActiveSpeakingMsgId(null);
    }
  };

  const handleTestAudio = () => {
    unlockAudio();
    playChime('test');
    const testPhrase = `Weather audio system active and working! Currently ${weather.temperature} degrees in ${city.name}.`;
    speakMessage(testPhrase, 'test-voice');
  };

  const speakMessage = (text: string, msgId: string, audioBase64?: string) => {
    unlockAudio();
    if (isSpeaking && activeSpeakingMsgId === msgId) {
      stopSpeaking();
      setIsSpeaking(false);
      setActiveSpeakingMsgId(null);
      return;
    }

    stopSpeaking();
    setIsSpeaking(true);
    setActiveSpeakingMsgId(msgId);

    speakText(
      text,
      language,
      () => {
        setIsSpeaking(true);
        setActiveSpeakingMsgId(msgId);
      },
      () => {
        setIsSpeaking(false);
        setActiveSpeakingMsgId(null);
      },
      () => {
        setIsSpeaking(false);
        setActiveSpeakingMsgId(null);
      },
      audioBase64
    );
  };

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputVal).trim();
    if (!query || isLoading) return;

    unlockAudio();
    setInputVal('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const payload = {
        message: query,
        language,
        weatherData: {
          cityName: city.name,
          country: city.country,
          temp: weather.temperature,
          apparentTemp: weather.apparentTemperature,
          condition: t.conditions[weather.conditionKey] || weather.conditionKey,
          humidity: weather.humidity,
          windSpeed: weather.windSpeed,
          precipitationChance: weather.precipitationChance,
          uvIndex: weather.uvIndex,
          tempUnit,
        },
      };

      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      const replyText = data.reply || data.fallback || 'I am updating my atmospheric models.';
      const audioBase64 = data.audioBase64 || undefined;

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: Date.now(),
        audioBase64,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      playChime('message');

      // Automatically speak the response if not muted!
      if (!isMuted) {
        speakMessage(replyText, assistantMsg.id, audioBase64);
      }
    } catch (err) {
      console.warn('Network issue communicating with AI assistant, falling back to local synthesis:', err);
      const fallbackText = generateWeatherVoiceResponse(query, {
        cityName: city.name,
        country: city.country,
        temp: weather.temperature,
        apparentTemp: weather.apparentTemperature,
        condition: t.conditions[weather.conditionKey] || weather.conditionKey,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
        precipitationChance: weather.precipitationChance,
        uvIndex: weather.uvIndex,
        tempUnit,
      }, language);

      const fallbackMsg: ChatMessage = {
        id: `ast-err-${Date.now()}`,
        sender: 'assistant',
        text: fallbackText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      if (!isMuted) {
        speakMessage(fallbackMsg.text, fallbackMsg.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicClick = () => {
    unlockAudio();
    if (isListening) {
      recognizerRef.current?.stop();
      setIsListening(false);
      playChime('mic_stop');
    } else {
      playChime('mic_start');
      setIsListening(true);
      recognizerRef.current?.start();
    }
  };

  const quickChips = [
    t.assistant.quickPrompts.wear,
    t.assistant.quickPrompts.rain,
    t.assistant.quickPrompts.climate,
    t.assistant.quickPrompts.weekend,
  ];

  return (
    <div className="w-full rounded-2xl bg-slate-950/80 backdrop-blur-xl border border-white/15 shadow-2xl flex flex-col h-[520px] sm:h-[560px] overflow-hidden">
      
      {/* Header Bar */}
      <div className="px-4 py-3.5 border-b border-white/10 bg-black/30 backdrop-blur-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="font-bold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
            <span>Weather Assistant</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>

        {/* Top Controls: Audio Test, Audio Mute Toggle & Clear Chat */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleTestAudio}
            className="px-2 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-sky-200 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 touch-manipulation shadow-sm"
            title="Test Phone Speaker"
          >
            <Volume2 className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Test Speaker</span>
            <span className="sm:hidden text-[11px]">Test</span>
          </button>

          <button
            onClick={handleToggleMute}
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
              isMuted
                ? 'bg-white/5 border-white/10 text-white/40'
                : 'bg-sky-500/20 border-sky-500/30 text-sky-300'
            }`}
            title={isMuted ? t.assistant.soundMuted : t.assistant.soundActive}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-sky-400" />}
          </button>

          <button
            onClick={() => {
              stopSpeaking();
              setIsSpeaking(false);
              setMessages([
                {
                  id: 'greeting',
                  sender: 'assistant',
                  text: t.assistant.greeting,
                  timestamp: Date.now(),
                },
              ]);
            }}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            title="Clear Chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Close Assistant"
              aria-label="Close Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scroll-smooth">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isThisSpeaking = isSpeaking && activeSpeakingMsgId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              {/* Speech Bubble */}
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[#0099ff] text-white font-normal shadow-md'
                    : 'bg-white/10 text-white/95 backdrop-blur-md border border-white/5 shadow-sm'
                }`}
              >
                <div className="whitespace-pre-line">{msg.text}</div>

                {/* Assistant Audio Action Button */}
                {!isUser && (
                  <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between gap-2 text-[11px]">
                    <button
                      onClick={() => speakMessage(msg.text, msg.id, msg.audioBase64)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all text-xs active:scale-95 touch-manipulation ${
                        isThisSpeaking
                          ? 'bg-sky-500 text-white font-semibold shadow-sm'
                          : 'bg-white/10 hover:bg-white/20 text-sky-300 hover:text-white border border-white/10'
                      }`}
                    >
                      {isThisSpeaking ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5" />
                          <span>Stop Voice</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                          <span>Listen to Voice</span>
                        </>
                      )}
                    </button>

                    {/* Animated sound wave bars when speaking */}
                    {isThisSpeaking && (
                      <div className="flex items-center gap-0.5 h-3">
                        <span className="w-0.5 h-2.5 bg-sky-400 animate-[bounce_0.6s_infinite_100ms] rounded-full" />
                        <span className="w-0.5 h-3 bg-sky-300 animate-[bounce_0.6s_infinite_200ms] rounded-full" />
                        <span className="w-0.5 h-1.5 bg-sky-400 animate-[bounce_0.6s_infinite_300ms] rounded-full" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2">
            <div className="bg-white/10 rounded-2xl p-3 border border-white/5 flex items-center gap-2 text-xs text-sky-300 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span>Checking weather telemetry...</span>
            </div>
          </div>
        )}

        {/* Active Audio Playback Notification */}
        {isSpeaking && (
          <div className="flex items-center justify-between px-3 py-2 bg-sky-500/15 border border-sky-500/25 rounded-xl text-xs text-sky-200">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 h-3">
                <span className="w-0.5 h-2.5 bg-sky-400 animate-[bounce_0.6s_infinite_100ms] rounded-full" />
                <span className="w-0.5 h-3.5 bg-sky-300 animate-[bounce_0.6s_infinite_200ms] rounded-full" />
                <span className="w-0.5 h-1.5 bg-sky-400 animate-[bounce_0.6s_infinite_300ms] rounded-full" />
              </div>
              <span className="font-medium">Voice assistant speaking...</span>
            </div>
            <button
              onClick={() => {
                stopSpeaking();
                setIsSpeaking(false);
                setActiveSpeakingMsgId(null);
              }}
              className="text-[11px] underline text-white/60 hover:text-white"
            >
              Stop Voice
            </button>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Quick Prompt Chips */}
      <div className="px-3 py-2 bg-black/20 border-t border-white/5 overflow-x-auto no-scrollbar flex items-center gap-1.5">
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(chip)}
            className="shrink-0 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] font-medium text-white/80 hover:text-white transition-all active:scale-95 whitespace-nowrap"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Form Bar */}
      <div className="p-3 bg-black/40 border-t border-white/10 backdrop-blur-md safe-bottom">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Mic Button */}
          <button
            type="button"
            onClick={handleMicClick}
            className={`p-2.5 rounded-xl border transition-all shrink-0 ${
              isListening
                ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'
            }`}
            title={isListening ? t.assistant.listening : t.assistant.micPrompt}
          >
            {isListening ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-sky-400" />}
          </button>

          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={isListening ? t.assistant.listening : 'Ask about the weather...'}
            className="flex-1 px-3.5 py-2.5 bg-white/5 border border-white/15 focus:border-sky-400 rounded-xl text-xs sm:text-sm text-white placeholder-white/40 outline-none transition-all"
          />

          <button
            type="submit"
            disabled={!inputVal.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-[#0099ff] hover:bg-[#0088ee] disabled:opacity-40 text-white font-semibold text-xs sm:text-sm shrink-0 transition-all shadow-md"
            title="Send"
          >
            Send
          </button>
        </form>
      </div>

    </div>
  );
}
