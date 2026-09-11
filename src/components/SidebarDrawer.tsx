import { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Navigation,
  Globe,
  Sliders,
  Volume2,
  VolumeX,
  Sparkles,
  Layers,
  Radio,
  Check,
  ExternalLink,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { Language, CityLocation, TemperatureUnit } from '../types';
import { translations } from '../data/translations';
import { DEFAULT_CITIES } from '../utils/weatherApi';
import { getAudioMuted, setAudioMuted, unlockAudio, playChime } from '../utils/audio';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentCity: CityLocation;
  onSelectCity: (city: CityLocation) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  unit: TemperatureUnit;
  onUnitToggle: () => void;
  onLocateUser: () => void;
  isLocating: boolean;
  onOpenAssistant?: () => void;
}

const LANGUAGES: { code: Language; name: string; nativeName: string; flag: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🌐' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
];

export function SidebarDrawer({
  isOpen,
  onClose,
  currentCity,
  onSelectCity,
  language,
  onLanguageChange,
  unit,
  onUnitToggle,
  onLocateUser,
  isLocating,
  onOpenAssistant,
}: SidebarDrawerProps) {
  const t = translations[language];
  const [isMuted, setIsMutedState] = useState(getAudioMuted());

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleToggleSound = () => {
    unlockAudio();
    const next = !isMuted;
    setAudioMuted(next);
    setIsMutedState(next);
    if (!next) {
      playChime('message');
    }
  };

  const handleTestAudio = () => {
    unlockAudio();
    playChime('message');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <aside
        className="fixed inset-y-0 left-0 max-w-full flex pr-10 z-50"
        role="dialog"
        aria-modal="true"
        aria-label="Weather GPT Settings"
      >
        <div className="w-screen max-w-sm sm:max-w-md bg-slate-900/95 backdrop-blur-2xl border-r border-white/10 shadow-2xl flex flex-col h-full text-slate-100 animate-slide-in-left">
          
          {/* Header */}
          <div className="p-5 border-b border-white/10 bg-slate-950/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight text-white">Weather GPT</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    v2.5
                  </span>
                </div>
                <div className="text-xs text-slate-400">Settings & Telemetry Hub</div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
            
            {/* Quick Action: Ask AI Meteorologist */}
            {onOpenAssistant && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-blue-950/30 to-indigo-950/40 border border-cyan-500/30 shadow-lg">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>Weather GPT Assistant</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                    Voice & Chat
                  </span>
                </div>
                <p className="text-xs text-slate-300 mb-3">
                  Ask atmospheric questions, request clothing suggestions, or get Doppler analysis.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onOpenAssistant();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 transition-all active:scale-98 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Launch Weather GPT Assistant</span>
                </button>
              </div>
            )}

            {/* Current Location & GPS */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Active Location</span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                <div className="truncate">
                  <div className="font-semibold text-sm text-slate-100 truncate">
                    {currentCity.name}, {currentCity.country}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {currentCity.latitude.toFixed(2)}°, {currentCity.longitude.toFixed(2)}°
                  </div>
                </div>

                <button
                  onClick={onLocateUser}
                  disabled={isLocating}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 active:scale-95 disabled:opacity-50"
                  title="Detect GPS location"
                >
                  <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Locating...' : 'GPS'}</span>
                </button>
              </div>
            </div>

            {/* Settings Section: Temperature & Speed Units */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Temperature & Wind Units</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10">
                <button
                  onClick={() => {
                    if (unit !== 'celsius') onUnitToggle();
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                    unit === 'celsius'
                      ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>°C Metric</span>
                  <span className="text-[10px] opacity-80 font-normal">Celsius &bull; km/h</span>
                </button>

                <button
                  onClick={() => {
                    if (unit !== 'fahrenheit') onUnitToggle();
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                    unit === 'fahrenheit'
                      ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>°F Imperial</span>
                  <span className="text-[10px] opacity-80 font-normal">Fahrenheit &bull; mph</span>
                </button>
              </div>
            </div>

            {/* Settings Section: Language Selector */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t.header.language}</span>
                </span>
                <span className="text-[11px] text-cyan-400 font-semibold uppercase">{language}</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto p-1 rounded-2xl bg-white/5 border border-white/10 scrollbar-thin">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      unlockAudio();
                      playChime('toggle');
                      onLanguageChange(l.code);
                    }}
                    className={`p-2 rounded-xl text-left text-xs font-medium transition-all flex items-center justify-between ${
                      language === l.code
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-base leading-none">{l.flag}</span>
                      <span className="truncate">{l.name}</span>
                    </div>
                    {language === l.code && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio & Voice Settings */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Voice & Sound FX</span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-xs text-slate-200">Synthesizer & Chimes</div>
                    <div className="text-[11px] text-slate-400">
                      {isMuted ? 'Muted — silent operation' : 'Active — audio feedback & voice answers'}
                    </div>
                  </div>

                  <button
                    onClick={handleToggleSound}
                    className={`p-2 rounded-xl border transition-all ${
                      isMuted
                        ? 'bg-slate-800 border-slate-700 text-slate-400'
                        : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                {!isMuted && (
                  <button
                    onClick={handleTestAudio}
                    className="w-full py-1.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-medium transition-all text-center border border-white/5"
                  >
                    Play Audio Test Chime
                  </button>
                )}
              </div>
            </div>

            {/* Quick Cities Directory */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>{t.header.popularCities}</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {DEFAULT_CITIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      unlockAudio();
                      playChime('toggle');
                      onSelectCity(c);
                      onClose();
                    }}
                    className={`px-3 py-2 rounded-xl text-left text-xs font-medium transition-all flex items-center justify-between ${
                      currentCity.id === c.id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-transparent'
                    }`}
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="text-[10px] text-slate-400 ml-1 font-mono uppercase">
                      {c.country.slice(0, 2)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Atmospheric Data Providers & Carto API Status */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Telemetry Sources</span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5 text-xs">
                {/* CARTO Basemap */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-semibold">CARTO Dark Matter</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Vector Basemap
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Global OpenStreetMap Tiles
                  </div>
                </div>

                {/* SSEC RealEarth Satellite IR */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>SSEC RealEarth Satellite IR</span>
                  </div>
                  <span className="text-[10px] text-emerald-300 font-mono">Live 24/7 Global</span>
                </div>

                {/* RainViewer Radar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>RainViewer Doppler</span>
                  </div>
                  <span className="text-[10px] text-slate-400">10-min Updates</span>
                </div>

                {/* Open-Meteo & ERA5 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>ERA5 Climate Archive</span>
                  </div>
                  <span className="text-[10px] text-slate-400">50-Year Models</span>
                </div>
              </div>
            </div>

          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-white/10 bg-slate-950/60 text-center text-xs text-slate-400">
            Weather GPT &bull; Meteorological Intelligence &copy; {new Date().getFullYear()}
          </div>

        </div>
      </aside>
    </div>
  );
}
