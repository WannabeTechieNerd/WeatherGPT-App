import { Droplets, CalendarDays, Clock, Sun, CloudRain, CloudSun, Cloud, Snowflake, CloudLightning } from 'lucide-react';
import { HourlyItem, DailyItem, Language, TemperatureUnit, WindSpeedUnit } from '../types';
import { translations } from '../data/translations';
import { formatTemp } from '../utils/weatherApi';

interface ForecastSectionProps {
  hourly: HourlyItem[];
  daily: DailyItem[];
  language: Language;
  tempUnit: TemperatureUnit;
  windUnit: WindSpeedUnit;
}

export function ForecastSection({
  hourly,
  daily,
  language,
  tempUnit,
}: ForecastSectionProps) {
  const t = translations[language];

  // Helper for weather icons
  const renderIcon = (key: string, isDay: boolean, size = 'w-7 h-7') => {
    switch (key) {
      case 'clear':
        return isDay ? <Sun className={`${size} text-amber-400`} /> : <Sun className={`${size} text-indigo-200`} />;
      case 'mainlyClear':
      case 'partlyCloudy':
        return <CloudSun className={`${size} text-amber-300`} />;
      case 'overcast':
      case 'fog':
      case 'depositingRimeFog':
        return <Cloud className={`${size} text-slate-300`} />;
      case 'lightDrizzle':
      case 'moderateDrizzle':
      case 'denseDrizzle':
      case 'slightRain':
      case 'moderateRain':
      case 'heavyRain':
        return <CloudRain className={`${size} text-cyan-400`} />;
      case 'slightSnow':
      case 'moderateSnow':
      case 'heavySnow':
        return <Snowflake className={`${size} text-sky-200`} />;
      case 'thunderstorm':
      case 'thunderstormWithHail':
        return <CloudLightning className={`${size} text-yellow-300`} />;
      default:
        return <CloudSun className={`${size} text-cyan-300`} />;
    }
  };

  // Find min/max for daily bar scaling
  const allMins = daily.map((d) => d.tempMin);
  const allMaxs = daily.map((d) => d.tempMax);
  const lowest = Math.min(...allMins);
  const highest = Math.max(...allMaxs);
  const range = Math.max(1, highest - lowest);

  return (
    <div className="w-full space-y-4 sm:space-y-6">
      
      {/* 1. Hourly Forecast Card */}
      <div className="rounded-3xl bg-slate-900/50 backdrop-blur-xl border border-white/10 p-5 sm:p-6 shadow-xl space-y-4">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-wider">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>{t.forecast.hourly24h}</span>
          </div>
          <span className="text-[11px] font-medium text-slate-400">Next 24 hours</span>
        </div>

        {/* Horizontal scroll container with smooth touch scrolling */}
        <div className="flex items-center gap-4 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
          {hourly.map((hour, idx) => {
            const timeObj = new Date(hour.timestamp);
            const hourLabel = idx === 0 ? t.forecast.now : timeObj.toLocaleTimeString([], { hour: 'numeric' });

            return (
              <div
                key={hour.timestamp}
                className="shrink-0 flex flex-col items-center justify-between py-2 px-3 rounded-2xl min-w-[70px] text-center space-y-2 hover:bg-white/5 transition-colors"
              >
                <span className="text-xs font-semibold text-slate-300 whitespace-nowrap">
                  {hourLabel}
                </span>

                <div className="my-1">
                  {renderIcon(hour.conditionKey, hour.isDay, 'w-7 h-7')}
                </div>

                <div className="text-sm font-bold text-white">
                  {formatTemp(hour.temp, tempUnit)}
                </div>

                {/* Rain probability */}
                <div className="h-4 flex items-center justify-center">
                  {hour.pop > 0 ? (
                    <div className="flex items-center gap-0.5 text-[11px] font-bold text-cyan-400">
                      <Droplets className="w-3 h-3 text-cyan-400" />
                      <span>{hour.pop}%</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-transparent">-</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* 2. 7-Day Extended Forecast Card */}
      <div className="rounded-3xl bg-slate-900/50 backdrop-blur-xl border border-white/10 p-5 sm:p-6 shadow-xl space-y-4">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-wider">
            <CalendarDays className="w-4 h-4 text-cyan-400" />
            <span>{t.forecast.daily7to10}</span>
          </div>
          <span className="text-[11px] font-medium text-slate-400">7-day outlook</span>
        </div>

        {/* 7-day rows with temperature range bars */}
        <div className="space-y-3 pt-1">
          {daily.map((day, idx) => {
            const isToday = idx === 0;
            const leftPercent = ((day.tempMin - lowest) / range) * 100;
            const barWidthPercent = Math.max(10, ((day.tempMax - day.tempMin) / range) * 100);

            return (
              <div
                key={day.timestamp}
                className="flex items-center justify-between gap-2 sm:gap-4 py-1.5 px-2 rounded-xl hover:bg-white/5 transition-colors text-sm"
              >
                {/* Day name */}
                <div className="w-20 sm:w-28 font-bold text-slate-200 truncate">
                  {isToday ? 'Today' : day.dayName}
                </div>

                {/* Condition Icon & Rain Probability */}
                <div className="flex items-center gap-2 w-16 sm:w-20">
                  {renderIcon(day.conditionKey, true, 'w-6 h-6')}
                  {day.pop > 0 && (
                    <span className="text-[11px] font-bold text-cyan-400">
                      {day.pop}%
                    </span>
                  )}
                </div>

                {/* Min Temp */}
                <div className="w-10 text-right font-mono text-xs sm:text-sm font-semibold text-slate-400">
                  {formatTemp(day.tempMin, tempUnit)}
                </div>

                {/* Colored Range Bar */}
                <div className="flex-1 max-w-xs h-1.5 rounded-full bg-slate-800/80 relative overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-400"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${barWidthPercent}%`,
                    }}
                  />
                </div>

                {/* Max Temp */}
                <div className="w-10 text-left font-mono text-xs sm:text-sm font-bold text-white">
                  {formatTemp(day.tempMax, tempUnit)}
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
