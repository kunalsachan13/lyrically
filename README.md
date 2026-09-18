# 🎵 Lyrically — AI Songwriting & YuE2/Suno Prompt Studio

**Lyrically** is a modern, studio-grade AI songwriting workstation designed for producers, artists, and creators. It channels any artist's lyrical style and vocal cadence to produce structured song lyrics, tailored **YuE2 & Suno AI** production prompts, viral social media captions, and targeted hashtags with zero downtime.

![Lyrically Studio](https://img.shields.io/badge/YuE2%20%26%20Suno-Ready-6366f1?style=for-the-badge)
![Next.js 16](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)
![React 19](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![Multi-Provider Failover](https://img.shields.io/badge/Failover-High--Availability-10b981?style=for-the-badge)

---

## ✨ Features

- 🎙️ **Artist Cadence & Style Mimicking**: Generate original lyrics that capture the vocabulary, mood, cadence, and rhyme schemes of any artist.
- ⚡ **YuE2 & Suno AI Prompts**: Formats DAW-ready prompts detailing BPM, instrument stacks, vocal delivery, and mix characteristics for instant music generation.
- 🌐 **Multi-Language Lyrics**: Full support for English, Spanish, Hindi, Hinglish, Japanese, Korean, French, German, Portuguese, Punjabi, Italian, Arabic, or custom dialects.
- 🏷️ **Smart Hashtag Cloud**: 5–8 genre, mood, and release hashtags with 1-click individual or bulk copying.
- 📱 **Viral Social Captions**: Punchy release teasers with emojis and quote snippets tailored for TikTok, Instagram Reels, and Spotify Canvas.
- 💾 **Persistent Generation History**: All generations are saved locally in `localStorage` with live search, preview tags, and instant studio restoration.
- 🔄 **Automatic Multi-Provider Failover**:
  - **Tier 1**: Render primary server.
  - **Tier 2**: OmniRoute (`claude-fable-5.1` / `cheaperinference.com`).
  - **Tier 3**: High-availability zero-config backup engine (Pollinations AI).
  - *If any server sleeps or errors, failover triggers in <1s with 0ms interruption.*
- 🎨 **Obsidian Studio Dark UI**: Built with custom Vanilla CSS glassmorphism, Google Fonts (`Outfit` & `JetBrains Mono`), animated audio waveform visualizers, and non-intrusive toast alerts.
- 📥 **Export to .txt**: One-click download of the complete lyric sheet and prompt package formatted as `[artist]_lyrics_[date].txt`.

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/kunalsachan13/lyrically.git
cd lyrically
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local` and add your API keys:
```bash
cp .env.example .env.local
```

```env
# Primary Render Server
KRISHNA_API_BASE=https://final-8ft2.onrender.com/v1
KRISHNA_API_KEY=your-render-key
KRISHNA_MODEL=fable-5.1

# OmniRoute (CheaperInference) Provider
OMNIROUTE_API_BASE=https://api.cheaperinference.com/v1
OMNIROUTE_API_KEY=your-omniroute-key
OMNIROUTE_MODEL=claude-fable-5.1
```

*(Note: If no API keys are provided or if servers are suspended, the built-in high-availability backup engine will automatically handle generation.)*

### 4. Run Locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⌨️ Shortcuts & Controls

- `Ctrl + Enter` (or `Cmd + Enter`): Instantly trigger song generation.
- **Try Example**: One-click prompt filler to quickly preview capabilities.
- **Provider Settings**: Inspect active AI routing and configure custom backup endpoints in real time.

---

## 📄 License
MIT
