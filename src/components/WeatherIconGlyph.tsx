import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudSnow,
  Snowflake,
  CloudFog,
  CloudHail,
} from 'lucide-react';

interface WeatherIconGlyphProps {
  conditionKey: string;
  isDay?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
}

export function WeatherIconGlyph({
  conditionKey,
  isDay = true,
  size = 'md',
  className = '',
}: WeatherIconGlyphProps) {
  // Explicit sharp dimensions (no blur filters or glow smudges)
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6 sm:w-7 sm:h-7',
    lg: 'w-10 h-10 sm:w-12 sm:h-12',
    hero: 'w-14 h-14 sm:w-16 sm:h-16',
  };

  const iconSize = sizeClasses[size];

  switch (conditionKey) {
    case 'clear':
      if (!isDay) {
        return (
          <Moon
            className={`${iconSize} text-indigo-200 fill-indigo-200/25 stroke-[2] shrink-0 ${className}`}
          />
        );
      }
      return (
        <Sun
          className={`${iconSize} text-amber-400 fill-amber-400/25 stroke-[2] shrink-0 ${className}`}
        />
      );

    case 'mainlyClear':
    case 'partlyCloudy':
      if (!isDay) {
        return (
          <CloudMoon
            className={`${iconSize} text-indigo-200 fill-indigo-100/20 stroke-[1.75] shrink-0 ${className}`}
          />
        );
      }
      return (
        <CloudSun
          className={`${iconSize} text-amber-400 fill-amber-300/25 stroke-[1.75] shrink-0 ${className}`}
        />
      );

    case 'overcast':
      return (
        <Cloud
          className={`${iconSize} text-slate-200 fill-white/20 stroke-[1.75] shrink-0 ${className}`}
        />
      );

    case 'fog':
    case 'depositingRimeFog':
      return (
        <CloudFog
          className={`${iconSize} text-slate-300 stroke-[1.75] shrink-0 ${className}`}
        />
      );

    case 'lightDrizzle':
    case 'moderateDrizzle':
      return (
        <CloudDrizzle
          className={`${iconSize} text-sky-300 stroke-[1.75] shrink-0 ${className}`}
        />
      );

    case 'denseDrizzle':
    case 'slightRain':
    case 'moderateRain':
      return (
        <CloudRain
          className={`${iconSize} text-sky-400 stroke-[1.75] shrink-0 ${className}`}
        />
      );

    case 'heavyRain':
      return (
        <CloudRain
          className={`${iconSize} text-blue-400 fill-blue-400/20 stroke-[2] shrink-0 ${className}`}
        />
      );

    case 'slightSnow':
    case 'moderateSnow':
      return (
        <CloudSnow
          className={`${iconSize} text-sky-200 stroke-[1.75] shrink-0 ${className}`}
        />
      );

    case 'heavySnow':
      return (
        <Snowflake
          className={`${iconSize} text-cyan-200 stroke-[2] shrink-0 ${className}`}
        />
      );

    case 'thunderstorm':
      return (
        <CloudLightning
          className={`${iconSize} text-amber-300 fill-amber-300/20 stroke-[1.75] shrink-0 ${className}`}
        />
      );

    case 'thunderstormWithHail':
      return (
        <CloudHail
          className={`${iconSize} text-amber-300 stroke-[1.75] shrink-0 ${className}`}
        />
      );

    default:
      return isDay ? (
        <CloudSun
          className={`${iconSize} text-amber-400 stroke-[1.75] shrink-0 ${className}`}
        />
      ) : (
        <CloudMoon
          className={`${iconSize} text-indigo-200 stroke-[1.75] shrink-0 ${className}`}
        />
      );
  }
}
