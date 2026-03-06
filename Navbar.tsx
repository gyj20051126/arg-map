
import React, { useRef, useState } from 'react';
import { Dna, Upload, Trash2, X, FileText, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = ({ 
  onViewChange, 
  currentView, 
  onUpload, 
  onClear, 
  hasUserData 
}: { 
  onViewChange: (v: any) => void, 
  currentView: string,
  onUpload: (file: File) => void,
  onClear: () => void,
  hasUserData: boolean
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUploadInfo, setShowUploadInfo] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowUploadInfo(false);
    }
  };

  return (
    <>
      <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 bg-[#050A18]/80 backdrop-blur-xl border-b border-white/5 pointer-events-auto transition-all">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onViewChange('landing')}>
          <div className="relative">
            <Dna size={28} className="text-cyan-400 group-hover:animate-spin-slow transition-transform duration-700" />
            <div className="absolute inset-0 bg-cyan-400/20 blur-lg rounded-full animate-pulse"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-white tracking-[0.2em] leading-none font-sans">ARG MAP</span>
            <span className="text-[9px] text-cyan-500/80 tracking-[0.4em] uppercase mt-1">Surveillance</span>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          {['landing', 'map', 'pcoa', 'trends'].map((view) => (
            <button 
              key={view}
              onClick={() => view === 'about' ? null : onViewChange(view)}
              className={`relative text-xs font-medium tracking-widest uppercase transition-all duration-500 group ${
                currentView === view ? 'text-cyan-400' : 'text-slate-500 hover:text-white'
              }`}
            >
              {view === 'landing' ? 'Overview' : view === 'map' ? 'Global Map' : view === 'pcoa' ? 'Analytics' : view === 'trends' ? 'Trend Forecast' : 'About'}
              <span className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-cyan-400 transition-all duration-300 group-hover:w-full ${currentView === view ? 'w-full shadow-[0_0_10px_#22d3ee]' : ''}`}></span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".csv" 
            className="hidden" 
          />
          {hasUserData && (
            <button 
              onClick={onClear}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded hover:bg-red-500/20 text-[10px] uppercase font-bold tracking-wider transition-all"
            >
              <Trash2 size={12} /> Clear User Data
            </button>
          )}
          <button 
            onClick={() => setShowUploadInfo(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black rounded hover:bg-cyan-400 text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)]"
          >
            <Upload size={14} /> Upload Data
          </button>
        </div>
      </nav>

      {/* Upload Guidelines Modal */}
      <AnimatePresence>
        {showUploadInfo && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a1025] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <div className="flex items-center gap-2 text-cyan-400">
                  <FileText size={20} />
                  <h2 className="text-lg font-bold text-white tracking-wide">Data Upload Guidelines</h2>
                </div>
                <button onClick={() => setShowUploadInfo(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
                  <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h3 className="text-sm font-bold text-blue-300 mb-1">Pre-calculation Required</h3>
                    <p className="text-xs text-blue-200/70 leading-relaxed">
                      This platform visualizes existing datasets. It does <strong>not</strong> calculate PCoA from raw sequences or abundance tables client-side.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] border border-slate-600">1</span>
                      Required Columns
                    </h4>
                    <p className="text-xs text-slate-400 ml-7 mb-2">
                      Your CSV must strictly contain the following headers:
                    </p>
                    <div className="ml-7 p-3 bg-slate-950 rounded border border-slate-800 font-mono text-[10px] text-cyan-500 break-all">
                      Sample_ID, Habitats, Regions, PC1, PC2
                    </div>
                  </div>

                  <div>
                     <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] border border-slate-600">2</span>
                      Calculation Method
                    </h4>
                    <p className="text-xs text-slate-400 ml-7 leading-relaxed">
                      To ensure your data aligns correctly with the global baseline, the <code className="text-slate-300 bg-slate-800 px-1 rounded">PC1</code> and <code className="text-slate-300 bg-slate-800 px-1 rounded">PC2</code> coordinates 
                      <strong> must be calculated based on a Bray-Curtis dissimilarity matrix</strong>. 
                      Using other metrics (e.g., Jaccard, UniFrac) will result in incorrect spatial projection.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button 
                    onClick={() => setShowUploadInfo(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold rounded-lg transition-all flex items-center gap-2"
                  >
                    <Upload size={14} />
                    Select CSV File
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
