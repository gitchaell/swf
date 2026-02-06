import React, { useState, useRef } from 'react';
import { NeonViewer } from './NeonViewer';
import { Upload, FileText, Download, Activity, Globe, Zap, Languages } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Language = 'ES' | 'PT' | 'EN';
type Mode = 'SYMBOLOGY' | 'FREQUENCY';

export const AnalysisContainer = () => {
  const [language, setLanguage] = useState<Language>('EN');
  const [mode, setMode] = useState<Mode>('SYMBOLOGY');
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setImageUrl(URL.createObjectURL(file));
      setResponse(''); // Clear previous response
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('image', image);
    formData.append('language', language);
    formData.append('mode', mode);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.error) {
          setResponse('Error: ' + data.error);
      } else {
          setResponse(data.text);
      }
    } catch (error) {
      console.error(error);
      setResponse('An error occurred during analysis.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    // Client-side simple print or alert
    window.print();
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 font-sans selection:bg-cyan-500/30">
      {/* Header */}
      <header className="fixed top-0 w-full z-10 bg-black/80 backdrop-blur-md border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity className="text-cyan-400 w-6 h-6 animate-pulse" />
            <h1 className="text-xl font-bold tracking-wider bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
              NEON<span className="text-white">NEXUS</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLanguage(l => l === 'EN' ? 'ES' : l === 'ES' ? 'PT' : 'EN')}
              className="flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 hover:border-cyan-500/50 transition-colors text-xs font-mono"
            >
              <Globe className="w-3 h-3" />
              {language}
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="pt-20 h-screen flex flex-col md:flex-row overflow-hidden">

        {/* Left: 3D Viewer */}
        <div className="relative w-full md:w-1/2 h-[40vh] md:h-full bg-slate-900 border-b md:border-b-0 md:border-r border-white/10">
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <div className="px-2 py-1 bg-black/50 backdrop-blur rounded text-xs font-mono text-cyan-400 border border-cyan-900">
              VISUALIZER_V1.0
            </div>
            {mode === 'FREQUENCY' && (
                <div className="px-2 py-1 bg-fuchsia-900/20 backdrop-blur rounded text-xs font-mono text-fuchsia-400 border border-fuchsia-900 animate-pulse">
                WAVE_ANALYSIS
                </div>
            )}
          </div>

          <NeonViewer imageUrl={imageUrl} />

          {/* Controls overlay */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="group relative px-6 py-2 bg-black/60 backdrop-blur-md border border-white/20 hover:border-cyan-400 text-sm rounded-full transition-all overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Upload className="w-4 h-4 group-hover:text-cyan-400 transition-colors" />
                UPLOAD_SOURCE
              </span>
              <div className="absolute inset-0 bg-cyan-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleUpload}
              accept="image/*"
            />
          </div>
        </div>

        {/* Right: Analysis & Chat */}
        <div className="w-full md:w-1/2 h-[60vh] md:h-full flex flex-col bg-black">

          {/* Mode Switcher */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setMode('SYMBOLOGY')}
              className={cn(
                "flex-1 py-4 text-sm tracking-widest font-mono transition-colors hover:bg-white/5",
                mode === 'SYMBOLOGY' ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500"
              )}
            >
              SYMBOLOGY
            </button>
            <button
              onClick={() => setMode('FREQUENCY')}
              className={cn(
                "flex-1 py-4 text-sm tracking-widest font-mono transition-colors hover:bg-white/5",
                mode === 'FREQUENCY' ? "text-fuchsia-400 border-b-2 border-fuchsia-400" : "text-slate-500"
              )}
            >
              FREQUENCY
            </button>
          </div>

          {/* Response Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {!response && !loading && (
                <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-4 opacity-50">
                    <Zap className="w-12 h-12" />
                    <p className="font-mono text-sm">AWAITING INPUT DATA...</p>
                </div>
            )}

            {loading && (
                <div className="space-y-4 animate-pulse">
                    <div className="h-4 bg-white/5 rounded w-3/4"></div>
                    <div className="h-4 bg-white/5 rounded w-1/2"></div>
                    <div className="h-4 bg-white/5 rounded w-5/6"></div>
                    <p className="text-cyan-500 font-mono text-xs pt-4">ACCESSING DAKILA ARCHIVES...</p>
                </div>
            )}

            {response && (
                <div className="prose prose-invert prose-p:text-slate-300 prose-headings:text-cyan-400 max-w-none">
                    <div className="font-mono text-xs text-slate-500 mb-4 border-b border-white/10 pb-2">
                        ANALYSIS COMPLETE // CONFIDENCE: 98.4%
                    </div>
                    <div dangerouslySetInnerHTML={{ __html: response.replace(/\n/g, '<br/>') }} />
                </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-6 border-t border-white/10 bg-black/50">
             <div className="flex gap-4">
                <button
                    onClick={handleAnalyze}
                    disabled={!image || loading}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(8,145,178,0.4)] hover:shadow-[0_0_30px_rgba(8,145,178,0.6)] flex items-center justify-center gap-2"
                >
                    {loading ? <Activity className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    INITIATE ANALYSIS
                </button>

                <button
                    onClick={downloadPDF}
                    disabled={!response}
                    className="px-4 border border-white/20 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
                >
                    <Download className="w-5 h-5" />
                </button>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};
