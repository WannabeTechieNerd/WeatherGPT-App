import { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  MapPin,
  Radio,
  Sliders,
  Navigation,
} from 'lucide-react';
import { Language, CityLocation } from '../types';
import { translations } from '../data/translations';
import { searchCities, DEFAULT_CITIES } from '../utils/weatherApi';
import { unlockAudio, playChime } from '../utils/audio';

interface NavbarProps {
  currentCity: CityLocation;
  onSelectCity: (city: CityLocation) => void;
  language: Language;
  onLocateUser: () => void;
  isLocating: boolean;
  onOpenSidebar: () => void;
}

export function Navbar({
  currentCity,
  onSelectCity,
  language,
  onLocateUser,
  isLocating,
  onOpenSidebar,
}: NavbarProps) {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CityLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchCities(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-slate-950/60 border-b border-white/10 safe-top">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Top Brand Bar & Sidebar Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {/* Left Sidebar Menu / Settings Trigger */}
            <button
              onClick={() => {
                unlockAudio();
                playChime('toggle');
                onOpenSidebar();
              }}
              className="p-2 sm:p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-sm"
              title="Open Settings & Sidebar"
              aria-label="Open Settings"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand Logo & Title */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-bold text-lg ring-1 ring-white/20">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                    Weather GPT
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hidden xs:inline-block">
                    Live
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="font-medium text-slate-200 truncate max-w-[140px] sm:max-w-[180px]">
                    {currentCity.name}, {currentCity.country}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Settings Button on Mobile */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              onClick={() => {
                unlockAudio();
                playChime('toggle');
                onOpenSidebar();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-cyan-300 flex items-center gap-1.5 active:scale-95"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Search Bar + Controls */}
        <div className="flex-1 max-w-xl relative" ref={searchContainerRef}>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder={t.header.searchPlaceholder}
                className="w-full pl-9 pr-8 py-2 bg-slate-900/60 border border-white/10 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-2xl text-sm text-slate-100 placeholder-slate-400 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* GPS Location Button */}
            <button
              onClick={() => {
                unlockAudio();
                playChime('toggle');
                onLocateUser();
              }}
              disabled={isLocating}
              className="px-3 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 active:scale-95 disabled:opacity-50"
              title={t.header.myLocation}
            >
              <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">{isLocating ? t.header.detecting : t.header.myLocation}</span>
            </button>
          </div>

          {/* Search Dropdown / Popular Cities */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
              {isSearching ? (
                <div className="py-4 text-center text-xs text-slate-400 animate-pulse">
                  Searching meteorological stations...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="py-1">
                  {searchResults.map((city) => (
                    <button
                      key={city.id}
                      onClick={() => {
                        unlockAudio();
                        onSelectCity(city);
                        setShowDropdown(false);
                        setSearchQuery('');
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-sm hover:bg-white/10 flex items-center justify-between border-b border-white/5 last:border-0 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <div>
                          <span className="font-semibold text-slate-100">{city.name}</span>
                          {city.admin1 && (
                            <span className="text-xs text-slate-400 ml-1.5">({city.admin1})</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">{city.country}</span>
                    </button>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  No cities found for &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="p-3">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    {t.header.popularCities}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DEFAULT_CITIES.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          unlockAudio();
                          onSelectCity(c);
                          setShowDropdown(false);
                        }}
                        className={`px-2.5 py-2 rounded-xl text-left text-xs font-medium transition-all flex items-center justify-between ${
                          currentCity.id === c.id
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-white/5 hover:bg-white/10 text-slate-200'
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        <span className="text-[10px] text-slate-400 ml-1">{c.country.slice(0, 2).toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Action: Settings Drawer Trigger on Desktop */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              unlockAudio();
              playChime('toggle');
              onOpenSidebar();
            }}
            className="px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/40 text-xs font-semibold text-slate-200 hover:text-white transition-all active:scale-95 flex items-center gap-2"
            title="Open Settings in Left Sidebar"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Settings</span>
          </button>
        </div>

      </div>
    </header>
  );
}
