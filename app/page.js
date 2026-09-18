'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  SparklesIcon,
  MusicIcon,
  CopyIcon,
  CheckIcon,
  HistoryIcon,
  TrashIcon,
  DownloadIcon,
  SearchIcon,
  CloseIcon,
  TagIcon,
  QuoteIcon,
  SlidersIcon,
  FileTextIcon,
  AudioWaveIcon,
  GlobeIcon,
  SettingsIcon,
  ServerIcon
} from './components/Icons';

const STORAGE_KEY = 'lyrically_song_history_v1';
const SETTINGS_KEY = 'lyrically_custom_api_settings';

const POPULAR_LANGUAGES = [
  'English',
  'Spanish',
  'Hindi',
  'Hinglish',
  'Japanese',
  'Korean',
  'French',
  'German',
  'Portuguese',
  'Punjabi',
  'Italian',
  'Arabic',
  'Custom'
];

const STYLE_PRESETS = [
  'Dark Melodic Trap',
  'Phonk Drift',
  '80s Synthwave',
  'Indie Bedroom Pop',
  'Acoustic Folk',
  'Hyperpop Glitch',
  'Afrobeats Groove',
  'Alt R&B Soul',
  'Nu-Metal Rap Rock',
  'Lo-Fi Nostalgia'
];

const EXAMPLE_SONG = {
  artist: 'The Weeknd & Post Malone',
  style: 'Dark cinematic synthwave meets melodic trap, moody reverberated vocals, 808 bass, late-night atmospheric synths',
  brief: 'A late night drive after heartbreak, seeing neon signs through rain on the windshield and battling memories.'
};

export default function Home() {
  const [artist, setArtist] = useState('');
  const [style, setStyle] = useState('');
  const [brief, setBrief] = useState('');
  const [language, setLanguage] = useState('English');
  const [customLanguage, setCustomLanguage] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // History & Drawer state
  const [history, setHistory] = useState([]);
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // Provider failover & settings state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastProviderUsed, setLastProviderUsed] = useState(null);
  const [fallbackNotice, setFallbackNotice] = useState(null);
  const [customApiSettings, setCustomApiSettings] = useState({
    fallbackBase: '',
    fallbackKey: '',
    fallbackModel: '',
  });

  // Toast notification state
  const [toast, setToast] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Load history & settings from localStorage on client mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }

      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        setCustomApiSettings(JSON.parse(savedSettings));
      }
    } catch (e) {
      console.error('Failed to read storage:', e);
    }
  }, []);

  // Save history to localStorage
  function saveHistoryToStorage(newHistory) {
    setHistory(newHistory);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }

  // Toast feedback helper
  function showToast(message) {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, 2800);
  }

  // Safe clipboard copy helper
  async function copyToClipboard(text, key, label) {
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedKey(key);
      showToast(`${label || 'Content'} copied to clipboard!`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      showToast('Could not copy to clipboard.');
    }
  }

  // Robust output parser for Tags, Caption, Style Prompt, and Lyrics
  const parsedData = useMemo(() => {
    if (!output) {
      return { tags: [], caption: '', stylePrompt: '', lyrics: '' };
    }

    // 1. Tags
    let tags = [];
    const tagsMatch = output.match(/TAGS:\s*([\s\S]*?)(?=(CAPTION:|STYLE PROMPT:|LYRICS:|$))/i);
    if (tagsMatch) {
      const rawTags = tagsMatch[1].trim();
      const hashtagMatches = rawTags.match(/#[a-zA-Z0-9_\u0080-\uFFFF]+/g);
      if (hashtagMatches && hashtagMatches.length > 0) {
        tags = Array.from(new Set(hashtagMatches));
      } else {
        tags = rawTags
          .split(/[\s,]+/)
          .map(t => t.trim().replace(/^#/, ''))
          .filter(Boolean)
          .map(t => `#${t}`);
      }
    }

    // 2. Caption
    let caption = '';
    const captionMatch = output.match(/CAPTION:\s*([\s\S]*?)(?=(STYLE PROMPT:|LYRICS:|$))/i);
    if (captionMatch) {
      caption = captionMatch[1].trim();
    }

    // 3. Style Prompt
    let stylePrompt = '';
    const styleMatch = output.match(/STYLE PROMPT:\s*([\s\S]*?)(?=(LYRICS:|$))/i);
    if (styleMatch) {
      stylePrompt = styleMatch[1].trim();
    }

    // 4. Lyrics
    let lyrics = '';
    const lyricsMatch = output.match(/LYRICS:\s*([\s\S]*)/i);
    if (lyricsMatch) {
      lyrics = lyricsMatch[1].trim();
    } else if (!tagsMatch && !captionMatch && !styleMatch) {
      // Backwards compatibility fallback if no section delimiters present
      lyrics = output.trim();
    }

    return { tags, caption, stylePrompt, lyrics };
  }, [output]);

  // Main generation handler
  async function handleGenerate() {
    if (!artist.trim() || !brief.trim()) {
      setError('Please provide both the Artist Name and a Song Description.');
      return;
    }

    setLoading(true);
    setError('');
    setOutput('');
    setActiveHistoryId(null);

    const effectiveLanguage = language === 'Custom' ? (customLanguage.trim() || 'English') : language;

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artist: artist.trim(),
          style: style.trim(),
          brief: brief.trim(),
          language: effectiveLanguage,
          customFallbackBase: customApiSettings.fallbackBase?.trim() || undefined,
          customFallbackKey: customApiSettings.fallbackKey?.trim() || undefined,
          customFallbackModel: customApiSettings.fallbackModel?.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      const rawText = data.text;
      setOutput(rawText);
      setLastProviderUsed(data.provider || 'AI Engine');
      setFallbackNotice(data.primaryNotice || null);

      // Create new history entry
      const newHistoryItem = {
        id: `song_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        artist: artist.trim(),
        style: style.trim(),
        brief: brief.trim(),
        language: effectiveLanguage,
        provider: data.provider || 'Primary',
        output: rawText,
      };

      const updatedHistory = [newHistoryItem, ...history.filter(h => h.id !== newHistoryItem.id)];
      saveHistoryToStorage(updatedHistory);
      setActiveHistoryId(newHistoryItem.id);
      showToast('Song & prompts generated successfully!');
    } catch (e) {
      setError(e.message || 'Something went wrong while generating.');
    } finally {
      setLoading(false);
    }
  }

  // Toggle style chip in style input
  function toggleStyleChip(chip) {
    if (!style) {
      setStyle(chip);
      return;
    }
    if (style.includes(chip)) {
      // Remove it
      const cleaned = style
        .split(',')
        .map(s => s.trim())
        .filter(s => s.toLowerCase() !== chip.toLowerCase())
        .join(', ');
      setStyle(cleaned);
    } else {
      // Append it
      setStyle(`${style.trim().replace(/,\s*$/, '')}, ${chip}`);
    }
  }

  // Load a song from history
  function loadHistoryItem(item) {
    setArtist(item.artist);
    setStyle(item.style || '');
    setBrief(item.brief);
    setOutput(item.output);
    setLastProviderUsed(item.provider || null);
    setFallbackNotice(null);
    const itemLang = item.language || 'English';
    if (POPULAR_LANGUAGES.includes(itemLang)) {
      setLanguage(itemLang);
      setCustomLanguage('');
    } else {
      setLanguage('Custom');
      setCustomLanguage(itemLang);
    }
    setActiveHistoryId(item.id);
    setIsHistoryOpen(false);
    setError('');
    showToast(`Loaded "${item.artist}" song from history`);
  }

  // Delete an item from history
  function deleteHistoryItem(id, e) {
    e?.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    saveHistoryToStorage(updated);
    if (activeHistoryId === id) {
      setActiveHistoryId(null);
    }
    showToast('Deleted song from history');
  }

  // Clear all history
  function clearAllHistory() {
    if (window.confirm('Are you sure you want to clear your entire song history? This cannot be undone.')) {
      saveHistoryToStorage([]);
      setActiveHistoryId(null);
      showToast('History cleared');
    }
  }

  // Export/Download active song as a formatted .txt file
  function downloadSongTxt() {
    if (!output) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${artist.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_lyrics_${dateStr}.txt`;
    const effectiveLanguage = language === 'Custom' ? (customLanguage.trim() || 'English') : language;

    let fileContent = `========================================================\n`;
    fileContent += `LYRICALLY AI STUDIO EXPORT\n`;
    fileContent += `Artist Reference: ${artist}\n`;
    fileContent += `Language: ${effectiveLanguage}\n`;
    if (style) fileContent += `Style / Sonic Profile: ${style}\n`;
    fileContent += `Song Concept: ${brief}\n`;
    fileContent += `Date: ${new Date().toLocaleString()}\n`;
    fileContent += `========================================================\n\n`;

    if (parsedData.tags.length > 0) {
      fileContent += `TAGS:\n${parsedData.tags.join(' ')}\n\n`;
    }

    if (parsedData.caption) {
      fileContent += `SOCIAL CAPTION / RELEASE TEASER:\n${parsedData.caption}\n\n`;
    }

    if (parsedData.stylePrompt) {
      fileContent += `YUE2 / SUNO AUDIO STYLE PROMPT:\n${parsedData.stylePrompt}\n\n`;
    }

    fileContent += `LYRICS:\n${parsedData.lyrics || output}\n`;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`);
  }

  // Copy full package
  function copyAll() {
    if (!output) return;
    copyToClipboard(output, 'all', 'Complete song package');
  }

  // Load example
  function loadExample() {
    setArtist(EXAMPLE_SONG.artist);
    setStyle(EXAMPLE_SONG.style);
    setBrief(EXAMPLE_SONG.brief);
    setError('');
  }

  // Clear current studio workspace
  function resetStudio() {
    setArtist('');
    setStyle('');
    setBrief('');
    setLanguage('English');
    setCustomLanguage('');
    setOutput('');
    setActiveHistoryId(null);
    setError('');
  }

  // Filtered history list
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return history;
    const q = historySearch.toLowerCase();
    return history.filter(item => {
      return (
        item.artist.toLowerCase().includes(q) ||
        (item.brief && item.brief.toLowerCase().includes(q)) ||
        (item.output && item.output.toLowerCase().includes(q))
      );
    });
  }, [history, historySearch]);

  // Formatted date helper
  function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);

    if (diffHours < 1) {
      const mins = Math.max(1, Math.round((now - date) / (1000 * 60)));
      return `${mins}m ago`;
    }
    if (diffHours < 24) {
      return `${Math.round(diffHours)}h ago`;
    }
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  // Keydown shortcut listener for Ctrl+Enter
  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  }

  return (
    <div className="app-container" onKeyDown={handleKeyDown}>
      {/* Top Navigation */}
      <header className="app-header">
        <div className="brand-section">
          <div className="logo-icon">
            <MusicIcon size={20} />
          </div>
          <div className="brand-info">
            <div className="brand-title">
              Lyrically
              <span className="brand-badge">YuE2 & Suno Studio</span>
            </div>
            <span className="brand-subtitle">AI Songwriting, Style Prompts & Social Captions</span>
          </div>
        </div>

        <div className="header-actions">
          {output && (
            <button className="btn-header" onClick={resetStudio} title="Start new song">
              <span>New Song</span>
            </button>
          )}

          <button
            className="btn-header"
            onClick={() => setIsSettingsOpen(true)}
            title="Provider & Fallback Settings"
          >
            <ServerIcon size={15} />
            <span>Providers</span>
          </button>

          <button
            className="btn-header"
            onClick={() => setIsHistoryOpen(true)}
            aria-label="Song History"
          >
            <HistoryIcon size={16} />
            <span>History</span>
            {history.length > 0 && (
              <span className="history-count-badge">{history.length}</span>
            )}
          </button>
        </div>
      </header>

      {/* Main Studio Workstation Layout */}
      <main className="main-layout">
        {/* Left Side: Inputs / Architect */}
        <section className="studio-sidebar">
          <div className="studio-card">
            <div className="card-title-row">
              <h2 className="card-title">
                <SlidersIcon size={18} />
                Song Architect
              </h2>
              {!artist && !brief && (
                <button
                  type="button"
                  className="btn-action"
                  onClick={loadExample}
                  style={{ fontSize: '11.5px', padding: '4px 10px' }}
                >
                  <SparklesIcon size={13} />
                  Try Example
                </button>
              )}
            </div>

            {/* Artist Input */}
            <div className="field-group">
              <label className="field-label" htmlFor="artist-input">
                <span>Artist Influence</span>
                <span className="field-hint">Required</span>
              </label>
              <input
                id="artist-input"
                className="input-styled"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="e.g. Juice WRLD, Billie Eilish, Drake, Lana Del Rey"
              />
            </div>

            {/* Style / Sonic Profile */}
            <div className="field-group">
              <label className="field-label" htmlFor="style-input">
                <span>Sonic Profile & Genre</span>
                <span className="field-hint">Optional</span>
              </label>
              <textarea
                id="style-input"
                className="textarea-styled"
                style={{ minHeight: '80px' }}
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="e.g. Dark melodic trap, phonk bass, intimate whispered vocals, 140 BPM"
              />
              
              {/* Preset Chips */}
              <div className="presets-container">
                {STYLE_PRESETS.map((chip) => {
                  const isActive = style.toLowerCase().includes(chip.toLowerCase());
                  return (
                    <button
                      key={chip}
                      type="button"
                      className={`preset-chip ${isActive ? 'active' : ''}`}
                      onClick={() => toggleStyleChip(chip)}
                      title={`Click to ${isActive ? 'remove' : 'add'} ${chip}`}
                    >
                      {isActive ? '✓ ' : '+ '}
                      {chip}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lyrics Language Selection */}
            <div className="field-group">
              <label className="field-label" htmlFor="language-select">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <GlobeIcon size={14} />
                  Lyrics Language
                </span>
                <span className="field-hint">
                  {language === 'Custom' ? (customLanguage || 'Custom') : language}
                </span>
              </label>
              
              <select
                id="language-select"
                className="select-styled"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {POPULAR_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>

              {/* Quick Language Chips */}
              <div className="language-quick-chips">
                {['English', 'Spanish', 'Hindi', 'Hinglish', 'Japanese', 'Korean'].map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    className={`language-chip ${language === lang ? 'active' : ''}`}
                    onClick={() => setLanguage(lang)}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              {language === 'Custom' && (
                <input
                  className="input-styled"
                  style={{ marginTop: '8px' }}
                  value={customLanguage}
                  onChange={(e) => setCustomLanguage(e.target.value)}
                  placeholder="Type any language (e.g. Punjabi, Tagalog, Latin, French)..."
                  autoFocus
                />
              )}
            </div>

            {/* Song Concept / Brief */}
            <div className="field-group">
              <label className="field-label" htmlFor="brief-input">
                <span>Song Concept & Narrative</span>
                <span className="field-hint">Required</span>
              </label>
              <textarea
                id="brief-input"
                className="textarea-styled"
                style={{ minHeight: '110px' }}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="e.g. An atmospheric late-night anthem about reminiscing on a past lover while driving through empty neon city streets under heavy rain."
              />
            </div>

            {/* Generate Action */}
            <button
              className="btn-generate"
              onClick={handleGenerate}
              disabled={loading || !artist.trim() || !brief.trim()}
            >
              {loading ? (
                <>
                  <AudioWaveIcon size={18} />
                  <span>Composing Song & Prompts...</span>
                </>
              ) : (
                <>
                  <SparklesIcon size={18} />
                  <span>Generate Full Song Package</span>
                </>
              )}
            </button>

            {error && (
              <div className="error-banner">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Output Studio Canvas */}
        <section className="studio-canvas">
          {/* 1. Loading State */}
          {loading && (
            <div className="loading-canvas">
              <div className="waveform-loader">
                <div className="wave-bar" />
                <div className="wave-bar" />
                <div className="wave-bar" />
                <div className="wave-bar" />
                <div className="wave-bar" />
                <div className="wave-bar" />
                <div className="wave-bar" />
              </div>
              <h3 className="loading-text">Writing Lyrics & Tuning Audio Prompts...</h3>
              <p className="loading-subtext">
                Channeling {artist}'s vocal cadence, crafting hooks, and generating viral hashtags.
              </p>
            </div>
          )}

          {/* 2. Empty State */}
          {!loading && !output && (
            <div className="empty-canvas">
              <div className="empty-icon-circle">
                <AudioWaveIcon size={36} />
              </div>
              <h3 className="empty-title">Ready for Inspiration</h3>
              <p className="empty-desc">
                Fill in an artist and song description on the left to generate complete structured lyrics,
                ready-to-paste YuE2 audio parameters, hashtags, and social captions.
              </p>
              
              <div className="empty-tips-grid">
                <div className="empty-tip-card">
                  <div className="empty-tip-title">⚡ YuE2 & Suno Audio Prompts</div>
                  <div className="empty-tip-text">Formats BPM, vocal delivery, and instrument stacks automatically.</div>
                </div>
                <div className="empty-tip-card">
                  <div className="empty-tip-title">🏷️ Smart Hashtags & Tags</div>
                  <div className="empty-tip-text">5–8 curated genre and vibe tags ready for social promotion.</div>
                </div>
                <div className="empty-tip-card">
                  <div className="empty-tip-title">📱 Viral Release Captions</div>
                  <div className="empty-tip-text">Punchy teaser text for TikTok, Instagram Reels, and Spotify.</div>
                </div>
                <div className="empty-tip-card">
                  <div className="empty-tip-title">💾 Auto-Save History</div>
                  <div className="empty-tip-text">All generations are saved locally for seamless recall.</div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Generated Results */}
          {!loading && output && (
            <div className="results-container">
              {/* Failover Alert Banner */}
              {fallbackNotice && (
                <div className="fallback-alert-banner">
                  <div className="fallback-alert-content">
                    <span style={{ fontSize: '16px' }}>⚡</span>
                    <div>
                      <strong>Auto-Failover Active:</strong> {fallbackNotice}
                    </div>
                  </div>
                  <button
                    className="btn-action"
                    style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(0,0,0,0.25)', borderColor: 'rgba(245,158,11,0.4)' }}
                    onClick={() => setFallbackNotice(null)}
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Results Top Action Bar */}
              <div className="results-header-card">
                <div className="results-meta">
                  <div className="results-artist-badge">
                    <MusicIcon size={18} />
                    <span>In the style of {artist}</span>
                  </div>
                  <span className="results-time-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <GlobeIcon size={13} />
                    {language === 'Custom' ? (customLanguage || 'Custom') : language}
                  </span>
                  {lastProviderUsed && (
                    <span className={`provider-pill ${fallbackNotice ? 'fallback-pill' : ''}`}>
                      <ServerIcon size={12} />
                      {lastProviderUsed}
                    </span>
                  )}
                </div>

                <div className="results-actions-group">
                  <button
                    className="btn-action"
                    onClick={() => copyToClipboard(parsedData.lyrics || output, 'lyrics-top', 'Lyrics')}
                  >
                    {copiedKey === 'lyrics-top' ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                    <span>Copy Lyrics</span>
                  </button>

                  {parsedData.stylePrompt && (
                    <button
                      className="btn-action"
                      onClick={() => copyToClipboard(parsedData.stylePrompt, 'style-top', 'Style prompt')}
                    >
                      {copiedKey === 'style-top' ? <CheckIcon size={14} /> : <SlidersIcon size={14} />}
                      <span>Copy Style Prompt</span>
                    </button>
                  )}

                  <button className="btn-action" onClick={downloadSongTxt}>
                    <DownloadIcon size={14} />
                    <span>Download .txt</span>
                  </button>

                  <button className="btn-action btn-primary-action" onClick={copyAll}>
                    {copiedKey === 'all' ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                    <span>Copy All</span>
                  </button>
                </div>
              </div>

              {/* Tags Section */}
              {parsedData.tags.length > 0 && (
                <div className="tags-card">
                  <div className="section-head">
                    <span className="section-title">
                      <TagIcon size={16} />
                      Genre & Vibe Tags ({parsedData.tags.length})
                    </span>
                    <button
                      className="btn-action"
                      style={{ fontSize: '11.5px', padding: '4px 10px' }}
                      onClick={() => copyToClipboard(parsedData.tags.join(' '), 'all-tags', 'All tags')}
                    >
                      {copiedKey === 'all-tags' ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                      <span>Copy All Tags</span>
                    </button>
                  </div>
                  <div className="tags-cloud">
                    {parsedData.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="tag-badge"
                        onClick={() => copyToClipboard(tag, `tag-${idx}`, tag)}
                        title="Click to copy hashtag"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Caption Section */}
              {parsedData.caption && (
                <div className="caption-card">
                  <div className="section-head">
                    <span className="section-title">
                      <QuoteIcon size={16} />
                      Social Media Caption & Teaser
                    </span>
                    <button
                      className="btn-action"
                      style={{ fontSize: '11.5px', padding: '4px 10px' }}
                      onClick={() => copyToClipboard(parsedData.caption, 'caption', 'Caption')}
                    >
                      {copiedKey === 'caption' ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                      <span>Copy Caption</span>
                    </button>
                  </div>
                  <div className="caption-content">
                    {parsedData.caption}
                  </div>
                </div>
              )}

              {/* Style Prompt Card (YuE2 / Suno) */}
              {parsedData.stylePrompt && (
                <div className="style-prompt-card">
                  <div className="section-head">
                    <span className="section-title">
                      <SlidersIcon size={16} />
                      YuE2 / Suno Style Prompt
                    </span>
                    <button
                      className="btn-action"
                      style={{ fontSize: '11.5px', padding: '4px 10px' }}
                      onClick={() => copyToClipboard(parsedData.stylePrompt, 'style', 'Style prompt')}
                    >
                      {copiedKey === 'style' ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                      <span>Copy Prompt</span>
                    </button>
                  </div>
                  <pre className="style-prompt-box">{parsedData.stylePrompt}</pre>
                </div>
              )}

              {/* Lyrics Sheet Card */}
              <div className="lyrics-card">
                <div className="section-head">
                  <span className="section-title">
                    <FileTextIcon size={16} />
                    Original Lyrics
                  </span>
                  <button
                    className="btn-action"
                    style={{ fontSize: '11.5px', padding: '4px 10px' }}
                    onClick={() => copyToClipboard(parsedData.lyrics || output, 'lyrics-sheet', 'Lyrics')}
                  >
                    {copiedKey === 'lyrics-sheet' ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                    <span>Copy Lyrics</span>
                  </button>
                </div>
                <pre className="lyrics-display">{parsedData.lyrics || output}</pre>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Slide-over History Drawer */}
      {isHistoryOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => setIsHistoryOpen(false)} />
          <aside className="history-drawer">
            <div className="drawer-header">
              <div className="drawer-title">
                <HistoryIcon size={18} />
                Song History
                {history.length > 0 && (
                  <span className="history-count-badge">{history.length}</span>
                )}
              </div>
              <button
                className="btn-icon-close"
                onClick={() => setIsHistoryOpen(false)}
                aria-label="Close history drawer"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            {/* Search filter */}
            <div className="drawer-search-bar">
              <div className="search-input-wrapper">
                <span className="search-icon-pos">
                  <SearchIcon size={15} />
                </span>
                <input
                  className="search-input"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search by artist, brief, or keywords..."
                />
                {historySearch && (
                  <button
                    className="btn-icon-close"
                    style={{ position: 'absolute', right: '8px' }}
                    onClick={() => setHistorySearch('')}
                  >
                    <CloseIcon size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* History Items List */}
            <div className="drawer-list">
              {filteredHistory.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-dim)' }}>
                  <p style={{ fontSize: '14px', marginBottom: '6px' }}>
                    {history.length === 0 ? 'No generations saved yet.' : 'No matches found.'}
                  </p>
                  <p style={{ fontSize: '12px' }}>
                    {history.length === 0 ? 'Generate your first song to see it here.' : 'Try a different search term.'}
                  </p>
                </div>
              ) : (
                filteredHistory.map((item) => {
                  const isActive = item.id === activeHistoryId;
                  return (
                    <div
                      key={item.id}
                      className={`history-card ${isActive ? 'active' : ''}`}
                      onClick={() => loadHistoryItem(item)}
                    >
                      <div className="history-card-top">
                        <span className="history-artist">{item.artist}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {item.language && (
                            <span style={{ fontSize: '10px', color: '#a5b4fc', background: 'rgba(99,102,241,0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              {item.language}
                            </span>
                          )}
                          <span className="history-date">{formatTime(item.timestamp)}</span>
                        </div>
                      </div>

                      <p className="history-brief-snippet">{item.brief}</p>

                      {/* Mini tags preview */}
                      {(() => {
                        const tagsMatch = item.output?.match(/TAGS:\s*([\s\S]*?)(?=(CAPTION:|STYLE PROMPT:|LYRICS:|$))/i);
                        const tags = tagsMatch ? tagsMatch[1].match(/#[a-zA-Z0-9_]+/g)?.slice(0, 3) : null;
                        if (tags && tags.length > 0) {
                          return (
                            <div className="history-tags-preview">
                              {tags.map((t, i) => (
                                <span key={i} className="history-mini-tag">{t}</span>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <div className="history-card-actions">
                        <button
                          type="button"
                          className="btn-mini-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadHistoryItem(item);
                          }}
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          className="btn-mini-action btn-delete"
                          onClick={(e) => deleteHistoryItem(item.id, e)}
                          title="Delete from history"
                        >
                          <TrashIcon size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer */}
            {history.length > 0 && (
              <div className="drawer-footer">
                <button className="btn-clear-history" onClick={clearAllHistory}>
                  <TrashIcon size={14} />
                  Clear All History
                </button>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  Stored in browser localStorage
                </span>
              </div>
            )}
          </aside>
        </>
      )}

      {/* Floating Toast Feedback */}
      {toast && (
        <div className="toast-container">
          <div className="toast-pill">
            <CheckIcon size={16} />
            <span>{toast}</span>
          </div>
        </div>
      )}

      {/* API Provider & Fallback Settings Modal */}
      {isSettingsOpen && (
        <div className="modal-backdrop" onClick={() => setIsSettingsOpen(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <ServerIcon size={18} />
                API Providers & Automatic Failover
              </h3>
              <button
                className="btn-icon-close"
                onClick={() => setIsSettingsOpen(false)}
                aria-label="Close modal"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Primary Provider Card */}
              <div className="provider-status-card">
                <div className="provider-status-header">
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>Primary Provider</span>
                  <span className="status-indicator" style={{ color: '#f59e0b' }}>
                    <span className="status-dot warning" />
                    Render (Auto-Sleep / Suspend)
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                  Endpoint: <code>https://final-8ft2.onrender.com/v1</code>
                </p>
              </div>

              {/* Built-in Auto Fallback Card */}
              <div className="provider-status-card">
                <div className="provider-status-header">
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>Automatic Failover</span>
                  <span className="status-indicator" style={{ color: '#10b981' }}>
                    <span className="status-dot online" />
                    High-Availability (Always Active)
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                  When the Render service sleeps or is suspended (HTTP 503), Lyrically automatically routes generation to the backup provider with 0ms interruption.
                </p>
              </div>

              {/* Custom Fallback Settings (Optional) */}
              <div style={{ marginTop: '8px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>
                  Custom Backup Endpoint (Optional)
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px' }}>
                  Provide your own OpenAI, Groq, or OpenRouter endpoint as an additional backup:
                </p>

                <div className="field-group" style={{ marginBottom: '10px' }}>
                  <label className="field-label" style={{ fontSize: '12px' }}>API Base URL</label>
                  <input
                    className="input-styled"
                    style={{ fontSize: '13px', padding: '9px 12px' }}
                    value={customApiSettings.fallbackBase || ''}
                    onChange={(e) => setCustomApiSettings({ ...customApiSettings, fallbackBase: e.target.value })}
                    placeholder="e.g. https://api.groq.com/openai/v1 or https://openrouter.ai/api/v1"
                  />
                </div>

                <div className="field-group" style={{ marginBottom: '10px' }}>
                  <label className="field-label" style={{ fontSize: '12px' }}>API Key</label>
                  <input
                    type="password"
                    className="input-styled"
                    style={{ fontSize: '13px', padding: '9px 12px' }}
                    value={customApiSettings.fallbackKey || ''}
                    onChange={(e) => setCustomApiSettings({ ...customApiSettings, fallbackKey: e.target.value })}
                    placeholder="sk-..."
                  />
                </div>

                <div className="field-group" style={{ marginBottom: '4px' }}>
                  <label className="field-label" style={{ fontSize: '12px' }}>Model Name</label>
                  <input
                    className="input-styled"
                    style={{ fontSize: '13px', padding: '9px 12px' }}
                    value={customApiSettings.fallbackModel || ''}
                    onChange={(e) => setCustomApiSettings({ ...customApiSettings, fallbackModel: e.target.value })}
                    placeholder="e.g. llama-3.3-70b-versatile or gpt-4o-mini"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-action"
                onClick={() => {
                  const reset = { fallbackBase: '', fallbackKey: '', fallbackModel: '' };
                  setCustomApiSettings(reset);
                  localStorage.removeItem(SETTINGS_KEY);
                  showToast('Custom settings reset to default');
                }}
              >
                Reset to Default
              </button>
              <button
                type="button"
                className="btn-action btn-primary-action"
                onClick={() => {
                  localStorage.setItem(SETTINGS_KEY, JSON.stringify(customApiSettings));
                  setIsSettingsOpen(false);
                  showToast('Saved fallback provider settings');
                }}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}