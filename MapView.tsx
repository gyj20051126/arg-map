import React, { useState, useMemo, useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { Globe as GlobeIcon, Activity, Zap, Shield, Sliders, Filter, Check } from 'lucide-react';
import { HABITAT_COLORS, CONTINENT_COLORS, USER_DATA_COLOR } from '../types'; 
import { getContinentColor } from '../utils'; 

// 接口定义
interface MapSample {
  id: string;
  lat: number;
  lng: number;
  habitats: string;
  sub_habitats?: string;
  continents: string;
  regions: string;
  pc1: number;
  pc2: number;
  isUserUploaded?: boolean;
  [key: string]: any;
}

const MapView = ({ data }: { data: any[] }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // --- 状态管理 ---
  const [isStaticMode, setIsStaticMode] = useState(false);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.02); 

  // --- 数据标准化处理 ---
  const normalizedData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      id: d.id || d.Sample_ID || d.index,
      lat: Number(d.lat || d.Lat), 
      lng: Number(d.lng || d.Lng),
      habitats: d.habitats || d.Habitats,
      sub_habitats: d.sub_habitats || d.Sub_habitats,
      regions: d.regions || d.Regions,
      continents: d.continents || d.Continents,
      pc1: Number(d.pc1 || d.PC1),
      pc2: Number(d.pc2 || d.PC2),
    })).filter(d => !isNaN(d.lat) && !isNaN(d.lng));
  }, [data]);

  const allHabitats = useMemo(() => Array.from(new Set(normalizedData.map((d: MapSample) => d.habitats))).sort(), [normalizedData]);
  const [selectedHabitats, setSelectedHabitats] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (normalizedData.length > 0 && selectedHabitats.size === 0) {
      setSelectedHabitats(new Set(allHabitats));
    }
  }, [normalizedData, allHabitats]);

  const toggleHabitat = (habitat: string) => {
    const next = new Set(selectedHabitats);
    if (next.has(habitat)) {
      next.delete(habitat);
    } else {
      next.add(habitat);
    }
    setSelectedHabitats(next);
  };

  const filteredData = useMemo(() => {
    return normalizedData.filter((d: MapSample) => selectedHabitats.has(d.habitats) || d.isUserUploaded);
  }, [normalizedData, selectedHabitats]);

  // --- 统计数据 ---
  const continentStats = useMemo(() => {
     const counts: Record<string, number> = {};
     filteredData.forEach((d: MapSample) => { 
       if (!d.isUserUploaded) {
         counts[d.continents] = (counts[d.continents] || 0) + 1; 
       }
     });
     return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [filteredData]);

  // --- 核心逻辑：生成点、线 ---
  const mapData = useMemo(() => {
    const points = filteredData.map((d: MapSample) => ({
      name: d.id,
      lat: d.lat,
      lng: d.lng,
      size: d.isUserUploaded ? 0.3 : 0.15,
      color: d.isUserUploaded ? USER_DATA_COLOR : getContinentColor(d.continents),
      habitat: d.habitats,
      region: d.regions,
      continent: d.continents,
      isUser: d.isUserUploaded,
      altitude: d.isUserUploaded ? 0.05 : 0.02,
      pc1: d.pc1,
      pc2: d.pc2
    }));

    const arcs: any[] = [];
    const activeRegions = new Set<string>();
    const validPoints = points.filter((d: any) => d.continent && !d.isUser);
    const maxArcs = Math.min(20 + Math.floor(similarityThreshold * 1500), 100);

    if (validPoints.length > 10) {
      let attempts = 0;
      while (arcs.length < maxArcs && attempts < 2000) {
        attempts++;
        const src = validPoints[Math.floor(Math.random() * validPoints.length)];
        const potentialMatches = validPoints.filter((dst: any) => {
           if (dst.name === src.name || dst.continent === src.continent) return false;
           const dx = src.pc1 - dst.pc1;
           const dy = src.pc2 - dst.pc2;
           const distance = Math.sqrt(dx*dx + dy*dy);
           (dst as any).tempDistance = distance;
           return distance < similarityThreshold;
        });

        if (potentialMatches.length > 0) {
          const dst = potentialMatches[Math.floor(Math.random() * potentialMatches.length)];
          const dist = (dst as any).tempDistance;
          const isDuplicate = arcs.some(arc => 
            (arc.startLat === src.lat && arc.endLat === dst.lat) || 
            (arc.startLat === dst.lat && arc.endLat === src.lat)
          );

          if (!isDuplicate) {
            const normalizedScore = 1 - (dist / similarityThreshold);
            const strokeWidth = 0.1 + Math.pow(normalizedScore, 2) * 0.8; 
            arcs.push({
              startLat: src.lat,
              startLng: src.lng,
              endLat: dst.lat,
              endLng: dst.lng,
              color: [src.color, dst.color],
              stroke: strokeWidth,
              originalDist: dist
            });
            if (src.region) activeRegions.add(src.region);
            if (dst.region) activeRegions.add(dst.region);
          }
        }
      }
    }
    return { points, arcs, activeRegions };
  }, [filteredData, isStaticMode, similarityThreshold]);

  // --- 标签逻辑 ---
  const labelData = useMemo(() => {
    const uniqueRegions = new Map<string, {name: string, lat: number, lng: number}>();
    filteredData.forEach((d: MapSample) => {
      if (d.regions && mapData.activeRegions.has(d.regions) && !d.isUserUploaded) {
        if (!uniqueRegions.has(d.regions)) {
           uniqueRegions.set(d.regions, { name: d.regions, lat: d.lat, lng: d.lng });
        }
      }
    });
    return Array.from(uniqueRegions.values());
  }, [filteredData, mapData.activeRegions]);

  // Resize Observer
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const handleGlobeReady = () => {
    setTimeout(() => {
       if (globeRef.current) {
          globeRef.current.controls().autoRotate = true;
          globeRef.current.controls().autoRotateSpeed = 0.5;
          globeRef.current.pointOfView({ altitude: 2.2 }, 1200);
       }
    }, 100);
  };

  return (
    <div className="flex h-full w-full bg-[#020617] relative overflow-hidden">
      
      {/* 左侧地图区域 */}
      <div ref={containerRef} className="flex-1 h-full relative min-w-0">
         {/* 左侧控制浮窗 */}
         <div className="absolute top-32 left-8 z-20 flex flex-col gap-4 pointer-events-auto">
            {/* Mode Toggle */}
            <div 
              onClick={() => setIsStaticMode(!isStaticMode)}
              className="group flex items-center gap-3 bg-slate-900/80 backdrop-blur-md p-2 px-4 border border-slate-700 rounded-full cursor-pointer hover:border-cyan-500 transition-all shadow-lg w-fit"
            >
               {isStaticMode ? <Shield size={14} className="text-cyan-400" /> : <Zap size={14} className="text-yellow-400 animate-pulse" />}
               <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">
                 {isStaticMode ? 'Static View' : 'Live Flux'}
               </span>
            </div>

            {/* Similarity Slider */}
            <div className="bg-slate-900/80 backdrop-blur-md p-4 border border-slate-700 rounded-xl shadow-lg w-64">
               <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Sliders size={14} className="text-cyan-400" />
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Bray-Curtis (PCoA)</span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-900">
                    &lt; {similarityThreshold.toFixed(3)}
                  </span>
               </div>
               <div className="relative h-6 flex items-center">
                 <input 
                    type="range" 
                    min="0.005" 
                    max="0.2" 
                    step="0.005" 
                    value={similarityThreshold}
                    onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                 />
               </div>
            </div>
         </div>

         {/* Globe Component */}
         {dimensions.width > 0 && dimensions.height > 0 && (
            <Globe
               ref={globeRef}
               width={dimensions.width}
               height={dimensions.height}
               globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
               backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
               onGlobeReady={handleGlobeReady}
               pointsData={mapData.points}
               pointLat="lat"
               pointLng="lng"
               pointColor="color"
               pointAltitude="altitude"
               pointRadius="size"
               pointResolution={2}
               pointsMerge={false}
               pointLabel={(d: any) => `
                  <div style="background: rgba(15, 23, 42, 0.95); padding: 10px; border: 1px solid ${d.isUser ? '#d946ef' : '#475569'}; border-radius: 8px; color: white; font-family: sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                     <div style="font-weight: bold; color: ${d.color}; font-size: 13px; margin-bottom: 4px;">${d.isUser ? 'USER UPLOAD' : d.name}</div>
                     <div style="font-size: 11px; color: #cbd5e1;">Region: <span style="color:white">${d.region}</span></div>
                     <div style="font-size: 11px; color: #cbd5e1;">Habitat: <span style="color:white">${d.habitat}</span></div>
                  </div>
               `}
               labelsData={labelData}
               labelLat="lat"
               labelLng="lng"
               labelText="name"
               labelSize={1.4}
               labelDotRadius={0.4}
               labelColor={() => '#fbbf24'}
               labelResolution={2}
               labelAltitude={0.01}
               arcsData={mapData.arcs}
               arcColor="color"
               arcStroke={(d: any) => d.stroke} 
               arcDashLength={isStaticMode ? 0 : 0.4}
               arcDashGap={isStaticMode ? 0 : 2}
               arcDashAnimateTime={isStaticMode ? 0 : 3000}
               atmosphereColor="#3b82f6"
               atmosphereAltitude={0.15}
            />
         )}

         {/* Continent Legend */}
         <div className="absolute bottom-10 left-8 bg-slate-900/80 p-4 rounded-lg border border-slate-700 pointer-events-none z-10 backdrop-blur-md shadow-2xl">
            <h3 className="text-white font-bold mb-3 text-xs uppercase tracking-wider text-cyan-500">Continent Key</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 pointer-events-auto">
               {Object.entries(CONTINENT_COLORS).map(([name, color]) => (
                  <div key={name} className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full" style={{backgroundColor: color}}></div>
                     <span className="text-[10px] text-slate-300 font-mono uppercase truncate max-w-[100px]">{name}</span>
                  </div>
               ))}
               <div className="flex items-center gap-2 mt-2 col-span-2 border-t border-slate-700 pt-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{backgroundColor: USER_DATA_COLOR}}></div>
                  <span className="text-[10px] text-fuchsia-300 font-mono uppercase font-bold">User Data</span>
               </div>
            </div>
         </div>
      </div>

      {/* 右侧边栏 */}
      <div className="w-80 flex-shrink-0 bg-slate-950/90 backdrop-blur-md border-l border-slate-800 flex flex-col z-30 shadow-2xl pt-20">
         
         {/* 1. Habitat Filter - 分离式布局 */}
         {/* 父容器：Flex Column, 不滚动 */}
         <div className="flex-1 flex flex-col min-h-0 border-b border-slate-800">
            
            {/* Header: 固定在上方，不滚动 */}
            <div className="p-6 pb-2 bg-slate-950/10 shrink-0 z-10">
               <h3 className="text-white font-bold flex items-center gap-2">
                  <Filter size={16} className="text-cyan-400" /> 
                  <span className="text-sm uppercase tracking-wider">Habitat Filter</span>
               </h3>
            </div>

            {/* Content: 独立滚动区域 */}
            <div className="overflow-y-auto p-6 pt-0 custom-scrollbar flex-1">
               <div className="space-y-2">
                  {allHabitats.map(habitat => {
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

         {/* 2. Stats & Info - 保持不变 */}
         <div className="p-6 bg-slate-900/50 flex-shrink-0">
            <div className="mb-6">
               <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
                  <GlobeIcon size={14} className="text-cyan-400" /> Regional Distribution
               </h3>
               <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={continentStats} layout="vertical" margin={{left: 0, right: 20}}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={70} tick={{fontSize: 9, fill: '#94a3b8'}} interval={0} />
                        <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{background: '#0f172a', border: '1px solid #334155'}} />
                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={8} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="p-3 bg-cyan-950/20 border border-cyan-900/50 rounded-lg">
               <div className="flex items-center gap-2 mb-1 text-cyan-400">
                  <Activity size={14} />
                  <span className="font-bold text-xs uppercase">Metric Info</span>
               </div>
               <p className="text-[10px] text-slate-400 leading-relaxed">
                  Connections represent <strong>Bray-Curtis</strong> similarity. 
                  <span className="text-white mx-1">Thicker lines</span> = Higher Similarity.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default MapView;