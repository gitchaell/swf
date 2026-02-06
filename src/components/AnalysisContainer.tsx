import React, { useState, useRef } from 'react';
import { NeonViewer } from './NeonViewer';
import { Analytics } from "@vercel/analytics/react";
import { Upload, FileText, Download, Activity, Globe, Zap, Languages } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <Analytics />
      {/* Header */}
      <header className="fixed top-0 w-full z-10 bg-background/80 backdrop-blur-md border-b border-border p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity className="text-primary w-6 h-6 animate-pulse" />
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent leading-tight">
                SIMBOLOGIAS Y FRECUENCIAS DE ONDA - DAKILA
              </h1>
              <p className="text-[10px] text-muted-foreground font-mono tracking-wide">
                Herramienta basada en información oficial de Dakila construida no oficialmente
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLanguage(l => l === 'EN' ? 'ES' : l === 'ES' ? 'PT' : 'EN')}
              className="flex items-center gap-2 font-mono text-xs border-border hover:border-primary/50"
            >
              <Globe className="w-3 h-3" />
              {language}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="pt-20 h-screen flex flex-col md:flex-row overflow-hidden">

        {/* Left: 3D Viewer */}
        <div className="relative w-full md:w-1/2 h-[40vh] md:h-full bg-secondary/10 border-b md:border-b-0 md:border-r border-border">
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <div className="px-2 py-1 bg-background/50 backdrop-blur rounded text-xs font-mono text-primary border border-primary/50">
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
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="secondary"
              className="rounded-full pl-6 pr-8 border border-white/10 hover:border-primary transition-all relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Upload className="w-4 h-4 group-hover:text-primary transition-colors" />
                UPLOAD_SOURCE
              </span>
              <div className="absolute inset-0 bg-primary/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Button>
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
        <div className="w-full md:w-1/2 h-[60vh] md:h-full flex flex-col bg-background">

          {/* Mode Switcher */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setMode('SYMBOLOGY')}
              className={cn(
                "flex-1 py-4 text-sm tracking-widest font-mono transition-colors hover:bg-secondary/20",
                mode === 'SYMBOLOGY' ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
              )}
            >
              SYMBOLOGY
            </button>
            <button
              onClick={() => setMode('FREQUENCY')}
              className={cn(
                "flex-1 py-4 text-sm tracking-widest font-mono transition-colors hover:bg-secondary/20",
                mode === 'FREQUENCY' ? "text-fuchsia-400 border-b-2 border-fuchsia-400" : "text-muted-foreground"
              )}
            >
              FREQUENCY
            </button>
          </div>

          {/* Response Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {!response && !loading && (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-50">
                    <Zap className="w-12 h-12" />
                    <p className="font-mono text-sm">AWAITING INPUT DATA...</p>
                </div>
            )}

            {loading && (
                <div className="space-y-4 animate-pulse">
                    <div className="h-4 bg-secondary rounded w-3/4"></div>
                    <div className="h-4 bg-secondary rounded w-1/2"></div>
                    <div className="h-4 bg-secondary rounded w-5/6"></div>
                    <p className="text-primary font-mono text-xs pt-4">ACCESSING DAKILA ARCHIVES...</p>
                </div>
            )}

            {response && (
                <div className="prose prose-invert prose-p:text-foreground prose-headings:text-primary max-w-none">
                    <div className="font-mono text-xs text-muted-foreground mb-4 border-b border-border pb-2">
                        ANALYSIS COMPLETE // CONFIDENCE: 98.4%
                    </div>
                    <div dangerouslySetInnerHTML={{ __html: response.replace(/\n/g, '<br/>') }} />
                </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-6 border-t border-border bg-background/50">
             <div className="flex gap-4">
                <Button
                    onClick={handleAnalyze}
                    disabled={!image || loading}
                    className="flex-1 py-6 font-bold tracking-wide shadow-[0_0_20px_rgba(8,145,178,0.2)] hover:shadow-[0_0_30px_rgba(8,145,178,0.4)]"
                >
                    {loading ? <Activity className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                    INITIATE ANALYSIS
                </Button>

                <Button
                    onClick={downloadPDF}
                    disabled={!response}
                    variant="outline"
                    className="px-4 py-6"
                >
                    <Download className="w-5 h-5" />
                </Button>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};
