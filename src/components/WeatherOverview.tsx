import type { ReactNode } from 'react';
import {
  Sun,
  Wind,
  Droplets,
  Gauge,
  Sunrise,
  Sunset,
  ShieldCheck,
  CloudRain,
  Compass,
} from 'lucide-react';
import {
  CurrentWeather,
  AirQualityData,
  CityLocation,
  Language,
  TemperatureUnit,
  WindSpeedUnit,
  HourlyItem,
  DailyItem,
} from '../types';
import { translations } from '../data/translations';
import { formatWind } from '../utils/weatherApi';
import { WeatherIconGlyph } from './WeatherIconGlyph';

interface WeatherOverviewProps {
  weather: CurrentWeather;
  aqi: AirQualityData;
  city: CityLocation;
  language: Language;
  tempUnit: TemperatureUnit;
  windUnit: WindSpeedUnit;
  todayMax: number;
  todayMin: number;
  hourly: HourlyItem[];
  daily: DailyItem[];
  children?: ReactNode;
}

export function WeatherOverview({
  weather,
  aqi,
  city,
  language,
  tempUnit,
  windUnit,
  todayMax,
  todayMin,
  hourly,
  daily,
  children,
}: WeatherOverviewProps) {
  const t = translations[language];

  // UV Level translation
  const getUvLevelText = (uv: number) => {
    if (uv <= 2) return { text: t.uvLevels.low, color: 'text-emerald-400' };
    if (uv <= 5) return { text: t.uvLevels.moderate, color: 'text-amber-400' };
    if (uv <= 7) return { text: t.uvLevels.high, color: 'text-orange-400' };
    if (uv <= 10) return { text: t.uvLevels.veryHigh, color: 'text-rose-400' };
    return { text: t.uvLevels.extreme, color: 'text-purple-400' };
  };

  // AQI Level translation
  const getAqiBadge = (statusKey: AirQualityData['statusKey']) => {
    switch (statusKey) {
      case 'good':
        return { text: t.aqiLevels.good, color: 'text-emerald-400' };
      case 'moderate':
        return { text: t.aqiLevels.moderate, color: 'text-yellow-400' };
      case 'unhealthySensitive':
        return { text: t.aqiLevels.unhealthySensitive, color: 'text-orange-400' };
      case 'unhealthy':
        return { text: t.aqiLevels.unhealthy, color: 'text-rose-400' };
      case 'veryUnhealthy':
        return { text: t.aqiLevels.veryUnhealthy, color: 'text-purple-400' };
      default:
        return { text: t.aqiLevels.hazardous, color: 'text-red-500' };
    }
  };

  const uvInfo = getUvLevelText(weather.uvIndex);
  const aqiInfo = getAqiBadge(aqi.statusKey);
  const conditionName = t.conditions[weather.conditionKey] || weather.conditionKey;

  // Cardinal wind direction
  const cardinalDirections = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const windDirText = cardinalDirections[Math.round((weather.windDirection % 360) / 22.5) % 16] || 'N';

  // 7 days for the daily forecast row
  const displayDays = daily.slice(0, 7);

  return (
    <div className="w-full space-y-6">
      
      {/* Main 3-Column / Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: Hero weather display + Hourly Forecast + 7-Day Forecast */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-5">
          
          {/* Hero Weather Section (Matching Screenshot) */}
          <div className="pt-2 pb-1 space-y-3">
            {/* City Subtitle */}
            <div className="flex items-center gap-2 text-white/80 text-xs sm:text-sm font-medium tracking-wide">
              <span>{city.name}, {city.country}</span>
            </div>

            {/* Ultra-Light Big Temperature Readout */}
            <div className="flex items-baseline select-none">
              <span className="text-7xl sm:text-8xl lg:text-9xl font-extralight tracking-tighter text-white leading-none">
                {Math.round(weather.temperature)}
              </span>
              <span className="text-3xl sm:text-4xl lg:text-5xl font-light text-white/80 ml-2">
                °{tempUnit === 'celsius' ? 'c' : 'f'}
              </span>
            </div>

            {/* Weather Icon + Condition + Feels Like */}
            <div className="flex items-center gap-4 pt-1">
              <WeatherIconGlyph
                conditionKey={weather.conditionKey}
                isDay={weather.isDay}
                size="lg"
              />
              <div className="space-y-0.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight drop-shadow-sm">
                  {conditionName}
                </h1>
                <p className="text-sm sm:text-base text-white/75 font-normal">
                  {t.overview.feelsLike} <span className="font-semibold text-white">{Math.round(weather.apparentTemperature)}°</span>
                </p>
              </div>
            </div>

            {/* High / Low Indicator with Arrows */}
            <div className="flex items-center gap-4 text-sm sm:text-base font-normal text-white/90 pt-1">
              <span className="flex items-center gap-1">
                <span className="text-white/70">↑</span>
                <span>{Math.round(todayMax)}°</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-white/70">↓</span>
                <span>{Math.round(todayMin)}°</span>
              </span>
            </div>
          </div>

          {/* 24-HOUR FORECAST Card */}
          <div className="rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 p-4 sm:p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-white/70">
              <span>{t.forecast.hourly24h || '24-HOUR FORECAST'}</span>
              <span className="text-[10px] font-normal text-white/50 tracking-normal normal-case">scroll for 24h</span>
            </div>

            {/* Smooth horizontal scroll row for 24 hours with razor-sharp icons */}
            <div className="flex items-center gap-2 sm:gap-3.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth">
              {hourly.slice(0, 24).map((h, idx) => {
                const timeObj = new Date(h.timestamp);
                const hourLabel =
                  idx === 0
                    ? 'Now'
                    : timeObj
                        .toLocaleTimeString([], { hour: 'numeric', hour12: true })
                        .toLowerCase();

                return (
                  <div
                    key={h.timestamp}
                    className="shrink-0 flex flex-col items-center justify-between space-y-1.5 py-1 px-1 min-w-[50px] sm:min-w-[56px] rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <span className="text-[11px] sm:text-xs font-medium text-white/80 whitespace-nowrap">
                      {hourLabel}
                    </span>

                    <div className="h-7 w-7 flex items-center justify-center my-0.5">
                      <WeatherIconGlyph conditionKey={h.conditionKey} isDay={h.isDay} size="md" />
                    </div>

                    <span className="text-xs sm:text-sm font-semibold text-white">
                      {Math.round(h.temp)}°
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7-DAY FORECAST Card */}
          <div className="rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 p-4 sm:p-5 shadow-2xl space-y-3.5">
            <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-white/70">
              {t.forecast.daily7to10 || '7-DAY FORECAST'}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center items-center">
              {displayDays.map((d) => {
                const dayName = new Date(d.timestamp)
                  .toLocaleDateString('en-US', { weekday: 'short' })
                  .toUpperCase();

                return (
                  <div key={d.timestamp} className="flex flex-col items-center justify-between space-y-1.5 py-1">
                    <span className="text-[11px] sm:text-xs font-semibold text-white/80 tracking-wider">
                      {dayName}
                    </span>

                    <div className="h-7 w-7 flex items-center justify-center my-0.5">
                      <WeatherIconGlyph conditionKey={d.conditionKey} isDay={true} size="md" />
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-xs sm:text-sm font-semibold text-white">
                        {Math.round(d.tempMax)}°
                      </div>
                      <div className="text-[11px] sm:text-xs font-normal text-white/60">
                        {Math.round(d.tempMin)}°
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* MIDDLE COLUMN: Metrics Cards */}
        <div className="lg:col-span-6 xl:col-span-3 space-y-4">
          
          {/* Card 1: Wind & Precipitation */}
          <div className="rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 p-4 sm:p-5 shadow-2xl space-y-4">
            {/* Wind Row */}
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 flex items-center justify-center text-white/90 shrink-0">
                <Wind className="w-6 h-6 text-white/90" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                  {t.overview.wind || 'WIND'}
                </div>
                <div className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>{formatWind(weather.windSpeed, windUnit)}</span>
                  <span className="text-xs font-medium text-white/70">{windDirText}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10" />

            {/* Precipitation Row */}
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 flex items-center justify-center text-white/90 shrink-0">
                <CloudRain className="w-6 h-6 text-sky-400" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                  {t.overview.precipitationChance || 'PRECIPITATION'}
                </div>
                <div className="text-base sm:text-lg font-bold text-white">
                  {weather.precipitationChance}%
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Sunrise & Sunset */}
          <div className="rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 p-4 sm:p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 flex items-center justify-center text-amber-300 shrink-0">
                <Sunrise className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                  {t.overview.sunrise || 'SUNRISE'}
                </div>
                <div className="text-base sm:text-lg font-bold text-white">
                  {weather.sunrise}
                </div>
              </div>
            </div>

            <div className="border-t border-white/10" />

            <div className="flex items-center gap-4">
              <div className="w-8 h-8 flex items-center justify-center text-amber-400 shrink-0">
                <Sunset className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                  {t.overview.sunset || 'SUNSET'}
                </div>
                <div className="text-base sm:text-lg font-bold text-white">
                  {weather.sunset}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Humidity & Pressure */}
          <div className="rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 p-4 sm:p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 flex items-center justify-center text-sky-400 shrink-0">
                <Droplets className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                  {t.overview.humidity || 'HUMIDITY'}
                </div>
                <div className="text-base sm:text-lg font-bold text-white">
                  {weather.humidity}%
                </div>
              </div>
            </div>

            <div className="border-t border-white/10" />

            <div className="flex items-center gap-4">
              <div className="w-8 h-8 flex items-center justify-center text-cyan-400 shrink-0">
                <Gauge className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                  {t.overview.pressure || 'PRESSURE'}
                </div>
                <div className="text-base sm:text-lg font-bold text-white">
                  {weather.pressure} hPa
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Air Quality & UV Index */}
          <div className="rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 p-4 sm:p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                  {t.overview.airQuality || 'AIR QUALITY'}
                </div>
                <div className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>AQI {aqi.aqi}</span>
                  <span className={`text-xs font-semibold ${aqiInfo.color}`}>({aqiInfo.text})</span>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10" />

            <div className="flex items-center gap-4">
              <div className="w-8 h-8 flex items-center justify-center text-amber-400 shrink-0">
                <Sun className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                  {t.overview.uvIndex || 'UV INDEX'}
                </div>
                <div className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>{weather.uvIndex}</span>
                  <span className={`text-xs font-semibold ${uvInfo.color}`}>({uvInfo.text})</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Docked Weather Assistant on Desktop */}
        <div className="lg:col-span-12 xl:col-span-4 hidden xl:block sticky top-20">
          {children}
        </div>

      </div>

    </div>
  );
}
