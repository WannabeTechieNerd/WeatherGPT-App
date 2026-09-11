export type Language =
  | 'en'
  | 'hi'
  | 'bn'
  | 'te'
  | 'ta'
  | 'mr'
  | 'gu'
  | 'kn'
  | 'ml'
  | 'pa'
  | 'es'
  | 'fr'
  | 'de'
  | 'zh'
  | 'ja'
  | 'ar'
  | 'ru'
  | 'pt';

export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type WindSpeedUnit = 'kmh' | 'mph';

export interface CityLocation {
  id: string;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  uvIndex: number;
  visibility: number;
  dewPoint: number;
  cloudCover: number;
  weatherCode: number;
  conditionKey: string;
  isDay: boolean;
  precipitation: number;
  precipitationChance: number;
  sunrise: string;
  sunset: string;
}

export interface HourlyItem {
  time: string; // ISO or formatted
  timestamp: number;
  temp: number;
  apparentTemp: number;
  weatherCode: number;
  conditionKey: string;
  pop: number; // Probability of precipitation %
  rain: number; // mm
  windSpeed: number;
  isDay: boolean;
}

export interface DailyItem {
  date: string;
  timestamp: number;
  dayName: string;
  weatherCode: number;
  conditionKey: string;
  tempMax: number;
  tempMin: number;
  pop: number;
  rainSum: number;
  uvIndexMax: number;
  windSpeedMax: number;
  sunrise: string;
  sunset: string;
}

export interface AirQualityData {
  aqi: number; // European or US AQI
  pm2_5: number;
  pm10: number;
  ozone: number;
  no2: number;
  so2: number;
  statusKey: 'good' | 'moderate' | 'unhealthySensitive' | 'unhealthy' | 'veryUnhealthy' | 'hazardous';
}

export interface RadarFrame {
  time: number;
  path: string;
}

export interface RainViewerData {
  version: string;
  generated: number;
  host: string;
  radar: {
    past: RadarFrame[];
    nowcast: RadarFrame[];
  };
  satellite: {
    infrared: RadarFrame[];
  };
}

export interface HistoricalYearRecord {
  year: number;
  avgTemp: number; // °C
  maxTemp: number;
  minTemp: number;
  heatwaveDays: number; // days > 32°C (90°F)
  freezingDays: number; // days < 0°C
  totalPrecipitation: number; // mm
  tempAnomaly: number; // relative to 1975-2005 baseline
}

export interface DecadeSummary {
  decade: string;
  startYear: number;
  endYear: number;
  avgTemp: number;
  tempAnomaly: number;
  extremeHeatDaysAvg: number;
  precipitationAvg: number;
}

export interface Historical50YearData {
  cityName: string;
  baselinePeriod: string;
  overallWarmingAnomaly: number; // e.g. +1.35°C
  recordMax: { temp: number; year: number; date?: string };
  recordMin: { temp: number; year: number; date?: string };
  annualRecords: HistoricalYearRecord[];
  decades: DecadeSummary[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  isAudioPlaying?: boolean;
  audioBase64?: string;
}
