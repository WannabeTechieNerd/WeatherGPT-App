import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  AlertCircle,
  Sparkles,
  Bot,
} from 'lucide-react';
import {
  CityLocation,
  Language,
  TemperatureUnit,
  WindSpeedUnit,
  CurrentWeather,
  HourlyItem,
  DailyItem,
  AirQualityData,
  Historical50YearData,
} from './types';
import { translations } from './data/translations';
import {
  DEFAULT_CITIES,
  fetchWeatherData,
  generate50YearClimateData,
} from './utils/weatherApi';
import { Navbar } from './components/Navbar';
import { SidebarDrawer } from './components/SidebarDrawer';
import { WeatherOverview } from './components/WeatherOverview';
import { ForecastSection } from './components/ForecastSection';
import { RadarMap } from './components/RadarMap';
import { Historical50Year } from './components/Historical50Year';
import { AIAssistant } from './components/AIAssistant';
import { unlockAudio, playChime } from './utils/audio';

export default function App() {
  const [currentCity, setCurrentCity] = useState<CityLocation>(DEFAULT_CITIES[0]);
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('weather_ai_lang') as Language;
      if (saved && translations[saved]) return saved;
    }
    return 'en';
  });

  const [unit, setUnit] = useState<TemperatureUnit>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('weather_ai_unit') as TemperatureUnit;
      if (saved) return saved;
    }
    return 'celsius';
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAssistantModalOpen, setIsAssistantModalOpen] = useState(false);

  // Weather Telemetry State
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyItem[]>([]);
  const [dailyForecast, setDailyForecast] = useState<DailyItem[]>([]);
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [historicalData, setHistoricalData] = useState<Historical50YearData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const windUnit: WindSpeedUnit = unit === 'celsius' ? 'kmh' : 'mph';

  // Save language and unit
  useEffect(() => {
    localStorage.setItem('weather_ai_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('weather_ai_unit', unit);
  }, [unit]);

  // Pre-unlock and maintain mobile audio on user touch/clicks (essential for Android 16 & Mobile PWA)
  useEffect(() => {
    const handleGesture = () => {
      unlockAudio();
    };
    window.addEventListener('touchstart', handleGesture, { passive: true });
    window.addEventListener('touchend', handleGesture, { passive: true });
    window.addEventListener('pointerdown', handleGesture, { passive: true });
    window.addEventListener('click', handleGesture, { passive: true });
    window.addEventListener('keydown', handleGesture, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleGesture);
      window.removeEventListener('touchend', handleGesture);
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };
  }, []);

  // Load weather and 50-year climate data for selected city
  const loadData = useCallback(async (city: CityLocation) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const weatherResult = await fetchWeatherData(city.latitude, city.longitude);
      setCurrentWeather(weatherResult.current);
      setHourlyForecast(weatherResult.hourly);
      setDailyForecast(weatherResult.daily);
      setAirQuality(weatherResult.aqi);

      // Generate 50-year climate dataset for this location
      const hist = generate50YearClimateData(city.name, city.latitude);
      setHistoricalData(hist);
    } catch (err: any) {
      console.error('Weather load error:', err);
      setErrorMessage('Could not connect to weather telemetry. Please check your network and retry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(currentCity);
  }, [currentCity, loadData]);

  // GPS Geolocation Detector
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        try {
          // Reverse geocode with OpenStreetMap Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
          ).then((r) => r.json());

          const detectedName =
            res.address?.city ||
            res.address?.town ||
            res.address?.village ||
            res.address?.county ||
            'My Location';
          const detectedCountry = res.address?.country || '';

          const userCity: CityLocation = {
            id: `gps-${Date.now()}`,
            name: detectedName,
            country: detectedCountry,
            latitude: lat,
            longitude: lon,
          };

          setCurrentCity(userCity);
        } catch {
          setCurrentCity({
            id: `gps-${Date.now()}`,
            name: 'Local Station',
            country: 'GPS',
            latitude: lat,
            longitude: lon,
          });
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleUnitToggle = () => {
    unlockAudio();
    playChime('toggle');
    setUnit((prev) => (prev === 'celsius' ? 'fahrenheit' : 'celsius'));
  };

  // Dynamic atmospheric sky backdrop based on live weather condition & daylight
  const atmosphereBackground = useMemo(() => {
    if (!currentWeather) {
      return 'from-slate-900 via-slate-950 to-slate-950';
    }

    if (!currentWeather.isDay) {
      // Night Sky
      return 'from-[#0e182e] via-[#091122] to-[#040812]';
    }

    // Day Sky
    switch (currentWeather.conditionKey) {
      case 'clear':
        return 'from-[#1963d2] via-[#114ba1] to-[#081e42]';
      case 'mainlyClear':
      case 'partlyCloudy':
        return 'from-[#2069d6] via-[#18468b] to-[#0c1d38]';
      case 'overcast':
      case 'fog':
      case 'depositingRimeFog':
        return 'from-[#3e4f66] via-[#293649] to-[#0f1724]';
      case 'lightDrizzle':
      case 'moderateDrizzle':
      case 'denseDrizzle':
      case 'slightRain':
      case 'moderateRain':
      case 'heavyRain':
        return 'from-[#27384f] via-[#1b2738] to-[#0b121c]';
      case 'slightSnow':
      case 'moderateSnow':
      case 'heavySnow':
        return 'from-[#425d7b] via-[#2c3f54] to-[#121c26]';
      case 'thunderstorm':
      case 'thunderstormWithHail':
        return 'from-[#221c4b] via-[#181238] to-[#090618]';
      default:
        return 'from-[#1d5ec4] via-[#13448a] to-[#091b36]';
    }
  }, [currentWeather]);

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 overflow-x-hidden">
      
      {/* Scenic Mountain Sunset Background (Matching Screenshot) */}
      <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
        <img
          src="/assets/mountain_weather_bg.jpg"
          alt="Scenic Mountain Weather Backdrop"
          className="w-full h-full object-cover object-center filter brightness-[0.88] contrast-[1.05]"
        />
        {/* Subtle dark tint overlay for crisp text readability */}
        <div className="absolute inset-0 bg-black/25 backdrop-blur-[0.5px]" />
      </div>

      {/* Settings Left Sidebar Drawer */}
      <SidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentCity={currentCity}
        onSelectCity={(c) => setCurrentCity(c)}
        language={language}
        onLanguageChange={(l) => setLanguage(l)}
        unit={unit}
        onUnitToggle={handleUnitToggle}
        onLocateUser={handleLocateUser}
        isLocating={isLocating}
        onOpenAssistant={() => setIsAssistantModalOpen(true)}
      />

      {/* Top Floating Glass Navigation Bar */}
      <Navbar
        currentCity={currentCity}
        onSelectCity={(c) => setCurrentCity(c)}
        language={language}
        onLocateUser={handleLocateUser}
        isLocating={isLocating}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      {/* Main Dashboard Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-8 sm:space-y-10">
        
        {/* Loading Spinner Skeleton */}
        {isLoading && !currentWeather && (
          <div className="py-24 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-cyan-300 animate-spin">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-white">
              Receiving high-resolution atmospheric models...
            </div>
            <div className="text-xs text-white/70">
              Synchronizing Doppler radar and 50-year climate records for {currentCity.name}
            </div>
          </div>
        )}

        {/* Error State */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-200 flex items-center justify-between gap-3 backdrop-blur-md">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => loadData(currentCity)}
              className="px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold shrink-0 shadow-md"
            >
              Retry
            </button>
          </div>
        )}

        {/* Unified Continuous Dashboard (All Data Preserved) */}
        {!isLoading && currentWeather && airQuality && historicalData && (
          <div className="w-full space-y-8 sm:space-y-10 animate-fade-in">
            
            {/* Primary Bento Layout: Hero, Forecasts, Metrics, Docked Assistant */}
            <section id="overview" className="w-full">
              <WeatherOverview
                weather={currentWeather}
                aqi={airQuality}
                city={currentCity}
                language={language}
                tempUnit={unit}
                windUnit={windUnit}
                todayMax={dailyForecast[0]?.tempMax ?? currentWeather.temperature}
                todayMin={dailyForecast[0]?.tempMin ?? currentWeather.temperature}
                hourly={hourlyForecast}
                daily={dailyForecast}
              >
                {/* Docked Weather Assistant on Desktop */}
                <AIAssistant
                  weather={currentWeather}
                  city={currentCity}
                  language={language}
                  tempUnit={unit}
                  isSpeaking={isSpeaking}
                  setIsSpeaking={setIsSpeaking}
                />
              </WeatherOverview>
            </section>

            {/* Live Doppler Radar Map */}
            <section id="radar" className="w-full">
              <RadarMap city={currentCity} language={language} />
            </section>

            {/* 50-Year Historical Climate Archive */}
            <section id="historical" className="w-full">
              <Historical50Year
                data={historicalData}
                language={language}
                tempUnit={unit}
              />
            </section>

          </div>
        )}

      </main>

      {/* Floating Weather Assistant Button (Elevated above navigation bars with distinct AI Assistant glyph) */}
      <div className="fixed bottom-10 right-5 sm:bottom-12 sm:right-8 z-40">
        <button
          onClick={() => {
            unlockAudio();
            playChime('toggle');
            setIsAssistantModalOpen((prev) => !prev);
          }}
          className="relative group w-14 h-14 sm:w-15 sm:h-15 rounded-full bg-gradient-to-tr from-[#0088ee] to-[#00aaff] hover:from-[#0077dd] hover:to-[#0099ff] text-white shadow-2xl shadow-[#0099ff]/50 hover:scale-105 active:scale-95 transition-all duration-300 ring-2 ring-white/40 flex items-center justify-center cursor-pointer"
          title={isAssistantModalOpen ? "Close AI Weather Assistant" : "Open AI Weather Assistant"}
          aria-label="Toggle AI Weather Assistant"
        >
          {/* Subtle AI ambient glow */}
          <span className="absolute -inset-0.5 rounded-full bg-cyan-400 opacity-30 group-hover:opacity-60 blur-sm transition-opacity" />

          {/* AI Assistant Glyph (Friendly Bot + Sparkle Badge) */}
          <div className="relative flex items-center justify-center">
            <Bot className="w-7 h-7 text-white stroke-[2.2] drop-shadow-sm" />
            <Sparkles className="w-3.5 h-3.5 text-cyan-100 fill-cyan-200/50 absolute -top-1.5 -right-1.5 animate-pulse" />
          </div>
        </button>
      </div>

      {/* Floating AI Assistant Popout Window */}
      {isAssistantModalOpen && currentWeather && (
        <div className="fixed bottom-26 right-3 sm:right-8 w-[calc(100vw-24px)] sm:w-[420px] max-w-[460px] h-[540px] max-h-[calc(100vh-130px)] z-50 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20 animate-slide-in-up">
          <AIAssistant
            weather={currentWeather}
            city={currentCity}
            language={language}
            tempUnit={unit}
            isSpeaking={isSpeaking}
            setIsSpeaking={setIsSpeaking}
            onClose={() => setIsAssistantModalOpen(false)}
          />
        </div>
      )}

      {/* Clean Minimal Footer */}
      <footer className="w-full border-t border-white/10 py-6 px-4 text-center text-xs text-white/50 bg-slate-950/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            Weather GPT &bull; {currentCity.name}, {currentCity.country}
          </div>
          <div className="text-[11px] text-white/40">
            CARTO Live Doppler &bull; Open-Meteo &bull; RainViewer Radar &bull; SSEC RealEarth Satellite IR &bull; ERA5 Climate Archive
          </div>
        </div>
      </footer>

    </div>
  );
}
