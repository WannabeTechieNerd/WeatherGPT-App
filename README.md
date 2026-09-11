# Weather GPT 🌦️🎙️

An intelligent, voice-enabled weather companion and meteorological intelligence platform. Weather GPT pairs high-precision real-time forecasting and live Doppler radar with a two-way conversational voice assistant and a 50-year historical climate archive spanning 18+ languages.

---

## ✨ Features

### 🎙️ Two-Way Conversational Voice AI
- **Hands-Free Speech Interaction**: Ask questions naturally using your microphone (*"Do I need an umbrella in Mumbai today?"*, *"Will it rain this evening?"*).
- **Zero-Latency Spoken Audio**: Responses are synthesized on the server and returned as embedded MP3 base64 payloads, playing instantly through the Web Audio API without mobile autoplay restrictions.
- **Smart Lifestyle & UV Advisories**: Real-time actionable guidance for sun protection, activewear, outdoor workouts, and rain gear based on UV index, humidity, and wind chill.

### 🛰️ Live Interactive Doppler Radar
- **High-Resolution Geospatial Mapping**: Powered by Leaflet with smooth panning, zoom controls, and geolocation centering.
- **Layer Toggles**: Real-time precipitation radar, cloud satellite layers, and atmospheric pressure overlays.

### 📈 50-Year Historical Climate Archive
- **Half-Century Climate Analysis**: Visualizes daily temperatures and weather anomalies comparing today's readings against historical baselines dating back to the 1970s via Open-Meteo's Historical Climate Archive.
- **Decadal Trends**: Examine climate shifts, warming anomalies, and historical temperature extremes for any selected global city.

### 🌐 18+ Multilingual Spoken Audio
- Native spoken responses and complete interface localization across major global and regional Indian languages:
  - **Global**: English (`en`), Spanish (`es`), French (`fr`), German (`de`), Japanese (`ja`), Russian (`ru`), Portuguese (`pt`), Chinese (`zh`), Arabic (`ar`)
  - **Regional Indian**: Hindi (`hi`), Bengali (`bn`), Telugu (`te`), Tamil (`ta`), Marathi (`mr`), Gujarati (`gu`), Kannada (`kn`), Malayalam (`ml`), Punjabi (`pa`)

### ⚡ PWA Ready & Mobile Optimized
- **Mobile-First Design**: Optimized touch targets, low-latency audio unlock on tap, and full viewport responsiveness.
- **Installable**: Supports Progressive Web App installation to home screens with dark atmospheric styling.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, `motion/react` |
| **Mapping & Visuals** | Leaflet, OpenStreetMap, CartoDB basemaps |
| **Backend Gateway** | Node.js, Express, `tsx`, `esbuild` |
| **Audio Engine** | Web Audio API (`AudioContext`, `AudioBufferSourceNode`), HTML5 Audio, Web Speech API |
| **AI Intelligence** | Google Gemini (`@google/genai`) with meteorological synthesis fallback |
| **Meteorological Data** | Open-Meteo Forecast API & 50-Year Historical Climate Archive |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+
- npm, yarn, or pnpm

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/weather-gpt.git
cd weather-gpt
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy the example environment file and configure your API keys:
```bash
cp .env.example .env
```

| Variable | Description | Required |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini API key for conversational intelligence | Optional (Fallback engine included) |
| `GROQ_API_KEY` | Optional secondary LLM key | Optional |

> **Note:** The app features a resilient built-in meteorological intelligence engine that delivers real-time weather answers in 18+ languages even without external API keys configured.

### 4. Run Development Server
```bash
npm run dev
```
The server will start on `http://localhost:3000`.

### 5. Build for Production
```bash
npm run build
npm start
```
- Compiles static client assets into `/dist` via Vite.
- Bundles the backend server into a standalone CommonJS executable (`dist/server.cjs`) using `esbuild`.

---

## 📡 API Endpoints

### `POST /api/ai/assistant`
Processes conversational queries with current meteorological context and returns text + embedded audio.
- **Request Body**:
  ```json
  {
    "message": "Should I wear a jacket in Paris right now?",
    "language": "en",
    "weatherData": {
      "cityName": "Paris",
      "country": "France",
      "temp": 14,
      "apparentTemp": 12,
      "condition": "Partly Cloudy",
      "humidity": 65,
      "windSpeed": 18,
      "precipitationChance": 10,
      "uvIndex": 3,
      "tempUnit": "C"
    }
  }
  ```
- **Response**:
  ```json
  {
    "reply": "At 14°C in Paris with an apparent temperature of 12°C, a light jacket or sweater is recommended.",
    "audioBase64": "data:audio/mp3;base64,//OExAAAA..."
  }
  ```

### `POST /api/ai/tts` & `GET /api/ai/tts`
Synthesizes clean natural speech audio for any given text and language code.
- Supports both `audio/mpeg` binary streaming and JSON `{ audioBase64 }` formatting.

### `GET /api/health`
Returns health check status and server timestamp.

---

## 🔊 Audio Engine Details

To overcome mobile browser restrictions (such as Android Chrome audio blocking where deferred network calls expire user-gesture tokens):
1. **Synchronous AudioContext Initialization**: Tapping any audio control immediately unlocks the audio context in the primary gesture tick.
2. **Dual-Path Decoding**: Pre-encoded base64 audio is decoded directly into an `AudioBuffer` via `ctx.decodeAudioData` and piped into a `GainNode`.
3. **Triple Fallback Protection**: If Web Audio fails, the player gracefully falls back to `HTMLAudioElement`, followed by the browser's native `window.speechSynthesis`.

---

## 📄 License

MIT License. Free to use, modify, and distribute for personal or commercial projects.
