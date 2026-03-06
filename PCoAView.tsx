import React, { useState, useMemo, useEffect } from 'react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import { FileText, Activity, Filter, Check, Info } from 'lucide-react';
import { HABITAT_COLORS, USER_DATA_COLOR } from '../types';

interface PCoASample {
  id: string;
  pc1: number;
  pc2: number;
  habitats: string;
  sub_habitats?: string;
  regions: string;
  isUserUploaded?: boolean;
  [key: string]: any;
}

const PCoAView = ({ data }: { data: any[] }) => {
  const normalizedData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      id: d.id || d.Sample_ID || d.index,
      habitats: d.habitats || d.Habitats,
      sub_habitats: d.sub_habitats || d.Sub_habitats,
      regions: d.regions || d.Regions,
      pc1: Number(d.pc1 || d.PC1),
      pc2: Number(d.pc2 || d.PC2),
    })).filter(d => !isNaN(d.pc1) && !isNaN(d.pc2));
  }, [data]);

  const allHabitats = useMemo(() => Array.from(new Set(normalizedData.map(d => d.habitats))).sort(), [normalizedData]);
  const [selectedHabitats, setSelectedHabitats] = useState<Set<string>>(new Set());

  const { filteredBaseData, userData } = useMemo(() => {
    const base = normalizedData.filter((d: PCoASample) => !d.isUserUploaded && selectedHabitats.has(d.habitats));
    const user = normalizedData.filter((d: PCoASample) => d.isUserUploaded);
    return { filteredBaseData: base, userData: user };
  }, [normalizedData, selectedHabitats]);

  useEffect(() => {
    if (normalizedData.length > 0 && selectedHabitats.size === 0) {
      setSelectedHabitats(new Set(allHabitats));
    }
  }, [normalizedData, allHabitats]);

  const toggleHabitat = (habitat: string) => {
    const next = new Set(selectedHabitats);
    if (next.has(habitat)) next.delete(habitat);
    else next.add(habitat);
    setSelectedHabitats(next);
  };

  const habitatStats = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredBaseData.forEach((d: PCoASample) => { counts[d.habitats] = (counts[d.habitats] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredBaseData]);

  const userDataSummary = useMemo(() => {
    if (userData.length === 0) return null;
    const avgPC1 = userData.reduce((acc, curr) => acc + curr.pc1, 0) / userData.length;
    const avgPC2 = userData.reduce((acc, curr) => acc + curr.pc2, 0) / userData.length;
    return { count: userData.length, avgPC1: avgPC1.toFixed(3), avgPC2: avgPC2.toFixed(3) };
  }, [userData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-600 p-3 rounded shadow-2xl text-xs max-w-[200px]">
          <div className={`font-bold mb-2 pb-1 border-b border-slate-700 ${d.isUserUploaded ? 'text-fuchsia-400' : 'text-cyan-400'}`}>
            {d.isUserUploaded ? 'USER SAMPLE' : d.id}
          </div>
          <div className="space-y-1">
             <div className="flex justify-between text-slate-300">
               <span>Region:</span> <span className="text-white">{d.regions}</span>
             </div>
             <div className="flex justify-between text-slate-300">
               <span>Habitat:</span> <span className="text-white" style={{color: HABITAT_COLORS[d.habitats]}}>{d.habitats}</span>
             </div>
             {d.sub_habitats && (
                <div className="flex justify-between text-slate-300">
                  <span>Subtype:</span> <span className="text-white italic">{d.sub_habitats}</span>
                </div>
             )}
             <div className="mt-2 pt-1 border-t border-slate-700 font-mono text-[10px] text-slate-500">
               PC1: {d.pc1.toFixed(3)} | PC2: {d.pc2.toFixed(3)}
             </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex h-full w-full bg-[#020617] relative">
      
      {/* Main Chart Area */}
      <div className="flex-1 p-6 pt-28 relative min-w-0 flex flex-col">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            PCoA Analysis
            <div className="group relative">
              <span className="text-xs font-normal text-slate-400 bg-slate-900/80 border border-slate-700 px-2 py-1 rounded-full flex items-center gap-1 cursor-help">
                Bray-Curtis Distance <Info size={10} />
              </span>
              <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-slate-800 border border-slate-600 rounded-lg text-[10px] text-slate-300 hidden group-hover:block z-50 shadow-xl">
                This projection relies on pre-calculated PC1/PC2 values derived from a Bray-Curtis dissimilarity matrix. Uploaded data must use the same metric for accurate comparison.
              </div>
            </div>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Visualizing beta-diversity across {filteredBaseData.length + userData.length} samples.
          </p>
        </div>

        <div className="flex-1 border border-slate-800 bg-slate-900/30 rounded-lg p-2">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
              <XAxis type="number" dataKey="pc1" name="PC1" stroke="#64748b" tick={{fontSize: 10, fill: '#64748b'}} label={{ value: 'PC1', position: 'bottom', fill: '#475569', fontSize: 12 }} />
              <YAxis type="number" dataKey="pc2" name="PC2" stroke="#64748b" tick={{fontSize: 10, fill: '#64748b'}} label={{ value: 'PC2', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 12 }} />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.2)' }} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{fontSize: '10px', paddingTop: '10px'}}/>
              
              {allHabitats.filter(h => selectedHabitats.has(h)).map((habitat) => (
                <Scatter 
                  key={habitat} 
                  name={habitat} 
                  data={filteredBaseData.filter((d: PCoASample) => d.habitats === habitat)} 
                  fill={HABITAT_COLORS[habitat] || '#fff'}
                  shape="circle"
                  opacity={0.6}
                />
              ))}

              {userData.length > 0 && (
                <Scatter 
                  name="User Data" 
                  data={userData} 
                  fill={USER_DATA_COLOR}
                  shape="star"
                  opacity={1}
                />
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

       {/* Right Sidebar */}
       <div className="w-80 flex-shrink-0 bg-slate-950/90 backdrop-blur-md border-l border-slate-800 flex flex-col z-20 shadow-xl pt-20">
         
         {/* Filter Section */}
         <div className="flex-1 flex flex-col min-h-0 border-b border-slate-800">
             
             {/* Header */}
             <div className="p-6 pb-2 bg-slate-950/10 shrink-0 z-10">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Filter size={16} className="text-cyan-400" /> 
                  <span className="text-sm uppercase tracking-wider">Habitat Filter</span>
                </h3>
             </div>

             {/* Content */}
             <div className="overflow-y-auto p-6 pt-0 custom-scrollbar flex-1">
                <div className="space-y-2">
                    {allHabitats.map(habitat => {
                       if (userData.some((u: PCoASample) => u.habitats === habitat)) return null;

                       const isSelected = selectedHabitats.has(habitat);
                       const color = HABITAT_COLORS[habitat] || '#94a3b8';
                       return (
                         <div 
                           key={habitat}
                           onClick={() => toggleHabitat(habitat)}
                           className={`
                             flex items-center gap-3 p-2 rounded-md cursor-pointer transition-all border
                             ${isSelected ? 'bg-slate-800/80 border-slate-600' : 'bg-transparent border-transparent hover:bg-slate-900'}
                           `}
                         >
                            <div 
                              className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${isSelected ? 'border-transparent' : 'border-slate-600'}`}
                              style={{ backgroundColor: isSelected ? color : 'transparent' }}
                            >
                              {isSelected && <Check size={12} className="text-white drop-shadow-md" strokeWidth={4} />}
                            </div>
                            <span className={`text-xs font-mono uppercase truncate ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                              {habitat}
                            </span>
                         </div>
                       );
                    })}
                </div>
             </div>
         </div>

         {/* Bottom Stats Section */}
         <div className="p-6 bg-slate-900/50 flex flex-col gap-6 flex-shrink-0">
             {userDataSummary && (
               <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 p-4 rounded-lg">
                 <h3 className="text-white font-bold mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
                   <FileText size={14} className="text-fuchsia-400" /> User Report
                 </h3>
                 <div className="space-y-2">
                   <div className="flex justify-between items-center text-xs border-b border-fuchsia-500/20 pb-1">
                     <span className="text-slate-400">Samples</span>
                     <span className="text-white font-mono font-bold">{userDataSummary.count}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs border-b border-fuchsia-500/20 pb-1">
                     <span className="text-slate-400">Avg PC1</span>
                     <span className="text-fuchsia-300 font-mono">{userDataSummary.avgPC1}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs border-b border-fuchsia-500/20 pb-1">
                     <span className="text-slate-400">Avg PC2</span>
                     <span className="text-fuchsia-300 font-mono">{userDataSummary.avgPC2}</span>
                   </div>
                 </div>
               </div>
             )}

            <div>
               <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
                  <Activity size={14} className="text-purple-400" /> Habitat Breakdown
               </h3>
               <div className="h-40 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie
                           data={habitatStats}
                           cx="50%"
                           cy="50%"
                           innerRadius={30}
                           outerRadius={50}
                           paddingAngle={5}
                           dataKey="value"
                        >
                           {habitatStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={HABITAT_COLORS[entry.name] || '#8884d8'} />
                           ))}
                        </Pie>
                        <RechartsTooltip 
                           contentStyle={{background: '#0f172a', border: '1px solid #334155', color: '#fff', fontSize: '10px'}} 
                           itemStyle={{ color: '#fff' }}
                        />
                     </PieChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default PCoAView;