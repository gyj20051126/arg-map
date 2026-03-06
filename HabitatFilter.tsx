
import React, { useState } from 'react';
import { Filter, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { HABITAT_COLORS } from '../types';

const HabitatFilter = ({ 
  availableHabitats, 
  selectedHabitats, 
  onChange 
}: { 
  availableHabitats: string[], 
  selectedHabitats: Set<string>, 
  onChange: (s: Set<string>) => void 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleHabitat = (habitat: string) => {
    const newSet = new Set(selectedHabitats);
    if (newSet.has(habitat)) {
      newSet.delete(habitat);
    } else {
      newSet.add(habitat);
    }
    onChange(newSet);
  };

  const toggleAll = () => {
    if (selectedHabitats.size === availableHabitats.length) {
      onChange(new Set());
    } else {
      onChange(new Set(availableHabitats));
    }
  };

  return (
    <div className="absolute top-24 right-8 z-40 flex flex-col items-end pointer-events-none">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`pointer-events-auto flex items-center gap-2 px-4 py-2 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:border-cyan-500 transition-all shadow-lg ${isOpen ? 'border-cyan-500 text-cyan-400' : ''}`}
      >
        <Filter size={14} />
        Filter Habitats
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="pointer-events-auto mt-2 p-4 bg-[#0a1025]/95 backdrop-blur-xl border border-slate-700 rounded-lg shadow-2xl w-64 max-h-[60vh] overflow-y-auto custom-scrollbar"
          >
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
              <span className="text-[10px] uppercase text-slate-500 font-bold">Select Habitats</span>
              <button onClick={toggleAll} className="text-[10px] text-cyan-400 hover:text-cyan-300">
                {selectedHabitats.size === availableHabitats.length ? 'None' : 'All'}
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {availableHabitats.map(hab => (
                <div 
                  key={hab} 
                  onClick={() => toggleHabitat(hab)}
                  className="flex items-center gap-3 cursor-pointer group hover:bg-white/5 p-1 rounded"
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedHabitats.has(hab) ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600 bg-transparent'}`}>
                    {selectedHabitats.has(hab) && <Check size={10} className="text-white" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: HABITAT_COLORS[hab] || '#fff' }}></div>
                    <span className={`text-xs ${selectedHabitats.has(hab) ? 'text-white' : 'text-slate-500'} group-hover:text-white transition-colors`}>
                      {hab.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HabitatFilter;
