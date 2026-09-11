import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  Play,
  Pause,
  RotateCcw,
  Layers,
  Maximize2,
  Minimize2,
  CloudRain,
  Radio,
  RefreshCw,
  Eye,
  Info,
} from 'lucide-react';
import { CityLocation, Language, RainViewerData, RadarFrame } from '../types';
import { translations } from '../data/translations';
import { fetchRainViewerData } from '../utils/weatherApi';
import { playChime } from '../utils/audio';

interface RadarMapProps {
  city: CityLocation;
  language: Language;
}

type LayerMode = 'radar' | 'satellite_ir' | 'satellite_vis';

export function RadarMap({ city, language }: RadarMapProps) {
  const t = translations[language];
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const weatherLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [rainViewerData, setRainViewerData] = useState<RainViewerData | null>(null);
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [activeLayerType, setActiveLayerType] = useState<LayerMode>('radar');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(900);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch RainViewer radar metadata
  const loadRadarData = async () => {
    setIsLoading(true);
    const data = await fetchRainViewerData();
    if (data) {
      setRainViewerData(data);
      const pastLen = data.radar?.past?.length || 0;
      setActiveFrameIndex(Math.max(0, pastLen - 1));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadRadarData();
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [city.latitude, city.longitude],
        zoom: 7,
        minZoom: 3,
        maxZoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      // CartoDB Dark Matter base tile layer (free open basemap)
      const baseLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          subdomains: 'abcd',
          maxZoom: 19,
        }
      ).addTo(map);

      baseTileLayerRef.current = baseLayer;

      // Custom Zoom control in bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    map.setView([city.latitude, city.longitude], map.getZoom());

    // Update City Pinpoint Marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    const customIcon = L.divIcon({
      className: 'custom-radar-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <span class="absolute w-8 h-8 rounded-full bg-cyan-400/40 animate-ping"></span>
          <span class="relative w-4 h-4 rounded-full bg-cyan-400 border-2 border-slate-950 shadow-lg shadow-cyan-400/70"></span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker([city.latitude, city.longitude], { icon: customIcon }).addTo(map);
    marker.bindPopup(`
      <div class="text-xs p-1.5 font-sans">
        <div class="font-bold text-slate-100 text-sm">${city.name}</div>
        <div class="text-[11px] text-cyan-400">${city.latitude.toFixed(2)}°, ${city.longitude.toFixed(2)}°</div>
      </div>
    `);
    markerRef.current = marker;

    // Invalidate map size after render to avoid grey tiles
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {};
  }, [city]);

  // Handle Fullscreen resize
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 300);
    }
  }, [isFullscreen]);

  // Extract frames based on active layer
  const radarFrames = useMemo(() => {
    const list: { frame: RadarFrame; type: 'past' | 'nowcast' }[] = [];
    if (rainViewerData?.radar) {
      (rainViewerData.radar.past || []).forEach((f) => list.push({ frame: f, type: 'past' }));
      (rainViewerData.radar.nowcast || []).forEach((f) => list.push({ frame: f, type: 'nowcast' }));
    }
    return list;
  }, [rainViewerData]);

  // Check if RainViewer has native satellite frames
  const rainViewerSatFrames = useMemo(() => {
    return rainViewerData?.satellite?.infrared || [];
  }, [rainViewerData]);

  // Active frame count for scrubber
  const totalFrames = activeLayerType === 'radar'
    ? radarFrames.length
    : (rainViewerSatFrames.length > 0 ? rainViewerSatFrames.length : 1);

  // Update Weather Layers (Doppler Radar OR Satellite Infrared OR Satellite Visible)
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove existing weather tile layer
    if (weatherLayerRef.current) {
      weatherLayerRef.current.remove();
      weatherLayerRef.current = null;
    }

    const host = rainViewerData?.host || 'https://tilecache.rainviewer.com';

    if (activeLayerType === 'radar') {
      // Live RainViewer Doppler Radar Tiles
      if (radarFrames.length === 0) return;
      const currentObj = radarFrames[activeFrameIndex] || radarFrames[radarFrames.length - 1];
      if (!currentObj) return;

      const path = currentObj.frame.path;
      // Color scheme 2 = universal Doppler weather radar colors; 1_1 = smoothed
      const tileUrl = `${host}${path}/256/{z}/{x}/{y}/2/1_1.png`;

      const layer = L.tileLayer(tileUrl, {
        opacity: 0.82,
        zIndex: 100,
        maxZoom: 16,
      }).addTo(mapInstanceRef.current);

      weatherLayerRef.current = layer;
    } else if (activeLayerType === 'satellite_ir') {
      // SATELLITE INFRARED:
      // Real-time 24/7 Global Infrared Cloud-Top Temperatures
      // SSEC RealEarth™ Composite (NOAA GOES-16/18, Meteosat-9/11, Himawari-9)
      const tileUrl = 'https://realearth.ssec.wisc.edu/tiles/globalir/{z}/{x}/{y}.png';

      const layer = L.tileLayer(tileUrl, {
        opacity: 0.82,
        zIndex: 100,
        maxNativeZoom: 9,
        maxZoom: 18,
        attribution: 'SSEC RealEarth™ Global IR',
      }).addTo(mapInstanceRef.current);

      weatherLayerRef.current = layer;
    } else if (activeLayerType === 'satellite_vis') {
      // SATELLITE VISIBLE CLOUDS:
      // RealEarth SSEC Global Visible daylight cloud imagery & cyclone dynamics
      const tileUrl = 'https://realearth.ssec.wisc.edu/tiles/globalvis/{z}/{x}/{y}.png';

      const layer = L.tileLayer(tileUrl, {
        opacity: 0.85,
        zIndex: 100,
        maxNativeZoom: 9,
        maxZoom: 18,
        attribution: 'SSEC RealEarth™ Global Visible',
      }).addTo(mapInstanceRef.current);

      weatherLayerRef.current = layer;
    }
  }, [activeLayerType, activeFrameIndex, radarFrames, rainViewerSatFrames, rainViewerData]);

  // Animation Loop
  useEffect(() => {
    if (!isPlaying || totalFrames <= 1) return;

    const interval = setInterval(() => {
      setActiveFrameIndex((prev) => (prev + 1) % totalFrames);
    }, playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, totalFrames, playbackSpeed]);

  // Current timestamp calculation
  const currentRadarObj = radarFrames[activeFrameIndex];
  const isNowcast = currentRadarObj?.type === 'nowcast';
  const frameTime = currentRadarObj ? new Date(currentRadarObj.frame.time * 1000) : new Date();

  return (
    <div
      className={`w-full transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 p-2 sm:p-4 bg-slate-950 flex flex-col' : 'space-y-3'
      }`}
    >
      {/* Header bar */}
      {!isFullscreen && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {t.radar.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playChime('toggle');
                loadRadarData();
              }}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-white/10"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isLoading ? t.radar.refreshing : 'Refresh'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Glassmorphic Rounded Card */}
      <div
        className={`relative overflow-hidden rounded-2xl border border-white/15 bg-black/40 backdrop-blur-md shadow-2xl ${
          isFullscreen ? 'flex-1 h-full' : 'h-[440px] sm:h-[500px]'
        }`}
      >
        {/* The Leaflet Canvas */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Top Control Bar: Layer Selector (Radar vs Infrared vs Visible), Time Stamp, Fullscreen */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none gap-2">
          
          {/* Pill Layer Switcher */}
          <div className="flex items-center gap-1 bg-slate-950/80 backdrop-blur-md p-1 rounded-2xl border border-white/10 pointer-events-auto shadow-xl">
            <button
              onClick={() => {
                playChime('toggle');
                setActiveLayerType('radar');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeLayerType === 'radar'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <CloudRain className="w-3.5 h-3.5" />
              <span>{t.radar.dopplerRadar}</span>
            </button>

            <button
              onClick={() => {
                playChime('toggle');
                setActiveLayerType('satellite_ir');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeLayerType === 'satellite_ir'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Satellite IR</span>
            </button>

            <button
              onClick={() => {
                playChime('toggle');
                setActiveLayerType('satellite_vis');
              }}
              className={`hidden xs:flex px-3 py-1.5 rounded-xl text-xs font-bold transition-all items-center gap-1.5 ${
                activeLayerType === 'satellite_vis'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visible</span>
            </button>
          </div>

          {/* Right Controls: Time badge + Fullscreen */}
          <div className="flex items-center gap-2">
            {activeLayerType === 'radar' ? (
              <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono font-bold text-slate-200 pointer-events-auto shadow-xl flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isNowcast ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                <span>{frameTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {isNowcast && (
                  <span className="text-[10px] uppercase font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                    {t.radar.nowcast}
                  </span>
                )}
              </div>
            ) : (
              <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono font-bold text-cyan-300 pointer-events-auto shadow-xl flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>Live Satellite</span>
              </div>
            )}

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-white border border-white/10 pointer-events-auto backdrop-blur-md shadow-xl"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

        </div>

        {/* Bottom Floating Control Bar: Scrubber + Play/Pause & Legend */}
        <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none">
          <div className="bg-slate-950/90 backdrop-blur-xl border border-white/10 p-3 rounded-2xl pointer-events-auto shadow-2xl space-y-2.5 max-w-lg mx-auto">
            
            {activeLayerType === 'radar' ? (
              <>
                {/* Timeline slider and play/pause for Radar */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      playChime('toggle');
                      setIsPlaying(!isPlaying);
                    }}
                    className="w-8 h-8 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center font-black shrink-0 active:scale-95 transition-all shadow-md shadow-cyan-500/30"
                    title={isPlaying ? t.radar.pause : t.radar.play}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                  </button>

                  <button
                    onClick={() => {
                      playChime('toggle');
                      setActiveFrameIndex(0);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors shrink-0"
                    title="Reset to past"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  {/* Scrubber slider */}
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      -2h
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, radarFrames.length - 1)}
                      value={activeFrameIndex}
                      onChange={(e) => {
                        setIsPlaying(false);
                        setActiveFrameIndex(Number(e.target.value));
                      }}
                      className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                    />
                    <span className="text-[10px] font-mono text-cyan-400 shrink-0 font-bold">
                      {isNowcast ? '+30m' : 'Now'}
                    </span>
                  </div>
                </div>

                {/* Radar Intensity Legend */}
                <div className="pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span>{t.radar.intensity}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span>Light</span>
                      <span>Moderate</span>
                      <span className="text-rose-400 font-bold">Severe</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-gradient-to-r from-cyan-600 via-emerald-400 via-amber-400 via-orange-500 to-purple-600" />
                  <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1">
                    <span>{t.radar.drizzle}</span>
                    <span>{t.radar.light}</span>
                    <span>{t.radar.moderate}</span>
                    <span>{t.radar.heavy}</span>
                    <span className="text-rose-400 font-bold">{t.radar.severe}</span>
                  </div>
                </div>
              </>
            ) : activeLayerType === 'satellite_ir' ? (
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center justify-between font-medium">
                  <span className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                    <Layers className="w-3.5 h-3.5" />
                    Global Satellite Infrared &bull; Thermal Clouds
                  </span>
                  <span className="text-[11px] text-slate-400">SSEC RealEarth / NOAA</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-600 via-cyan-400 to-white" />
                <div className="flex items-center justify-between text-[9px] text-slate-400">
                  <span>Warm Surface</span>
                  <span>Mid-Level Clouds</span>
                  <span className="text-cyan-300 font-bold">Cold Storm Cloud Tops & Eyewalls</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center justify-between font-medium">
                  <span className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                    <Eye className="w-3.5 h-3.5" />
                    Global Visible Satellite
                  </span>
                  <span className="text-[11px] text-slate-400">SSEC RealEarth™</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Live daylight satellite view showing actual cloud cover, cyclones, and atmospheric dynamics.
                </p>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
