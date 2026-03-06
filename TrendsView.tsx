import React, { useState, useMemo, useEffect } from 'react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, AreaChart, Area, ReferenceLine, BarChart, Bar, Cell
} from 'recharts';
import { Play, Pause, AlertTriangle, ShieldCheck, Activity, Target, GitMerge, Thermometer } from 'lucide-react';

// 定义接口兼容现有数据
interface PCoASample {
  id: string;
  pc1: number;
  pc2: number;
  habitats: string;
  sub_habitats?: string;
  [key: string]: any;
}

const HABITAT_COLORS: Record<string, string> = {
  'Soil': '#4ade80',           // 绿色
  'Natural_water': '#3b82f6',  // 蓝色
  'Sewage': '#f43f5e',         // 红色 (高危中心)
  'WWTP': '#fbbf24',           // 黄色 (次高危)
  'Marine_water': '#0ea5e9',
  'Human_feces': '#ec4899',
  'Chicken_feces': '#f97316',
  'Cattle_feces': '#a855f7',
  'Swine_feces': '#d946ef',
};

const TrendsView = ({ data }: { data: any[] }) => {
  const [scenario, setScenario] = useState<'bau' | 'one_health'>('bau');
  const [year, setYear] = useState(2024);
  const [isPlaying, setIsPlaying] = useState(false);

  // --- 1. 数据预处理与核心质心计算 ---
  const { coreCentroid, habitatData, subHabitatData } = useMemo(() => {
    // 过滤有效数据
    const validData = data.filter(d => !isNaN(d.pc1) && !isNaN(d.pc2));
    
    // 计算"高危引力中心" (Sewage, WWTP, 各种粪便的平均位置)
    const highRiskSamples = validData.filter(d => 
      ['Sewage', 'WWTP', 'Human_feces', 'Chicken_feces', 'Cattle_feces', 'Swine_feces'].includes(d.habitats || d.Habitats)
    );
    
    const corePC1 = highRiskSamples.reduce((sum, d) => sum + (d.pc1 || d.PC1), 0) / (highRiskSamples.length || 1);
    const corePC2 = highRiskSamples.reduce((sum, d) => sum + (d.pc2 || d.PC2), 0) / (highRiskSamples.length || 1);

    // 计算各主生境的质心
    const habGroups: Record<string, { pc1: number[], pc2: number[] }> = {};
    const subGroups: Record<string, { pc1: number[], pc2: number[], mainHab: string }> = {};

    validData.forEach(d => {
      const hab = d.habitats || d.Habitats;
      const sub = d.sub_habitats || d.Sub_habitats || hab;
      
      if (!habGroups[hab]) habGroups[hab] = { pc1: [], pc2: [] };
      habGroups[hab].pc1.push(d.pc1 || d.PC1);
      habGroups[hab].pc2.push(d.pc2 || d.PC2);

      if (!subGroups[sub]) subGroups[sub] = { pc1: [], pc2: [], mainHab: hab };
      subGroups[sub].pc1.push(d.pc1 || d.PC1);
      subGroups[sub].pc2.push(d.pc2 || d.PC2);
    });

    const habCentroids = Object.keys(habGroups).map(name => ({
      name,
      basePC1: habGroups[name].pc1.reduce((a, b) => a + b, 0) / habGroups[name].pc1.length,
      basePC2: habGroups[name].pc2.reduce((a, b) => a + b, 0) / habGroups[name].pc2.length,
      isCore: ['Sewage', 'WWTP', 'Human_feces', 'Chicken_feces', 'Cattle_feces', 'Swine_feces'].includes(name)
    }));

    const subCentroids = Object.keys(subGroups).map(name => ({
      name,
      mainHab: subGroups[name].mainHab,
      basePC1: subGroups[name].pc1.reduce((a, b) => a + b, 0) / subGroups[name].pc1.length,
      basePC2: subGroups[name].pc2.reduce((a, b) => a + b, 0) / subGroups[name].pc2.length,
    }));

    return { 
      coreCentroid: { pc1: corePC1, pc2: corePC2 }, 
      habitatData: habCentroids,
      subHabitatData: subCentroids
    };
  }, [data]);

  // --- 2. 预测动力学模型 ---
  const timelineData = useMemo(() => {
    const years = Array.from({length: 12}, (_, i) => 2024 + i); // 2024 - 2035
    
    // 情景速率设定: bau (Business As Usual) 较快, one_health (环保政策) 极慢甚至负增长
    const baseDriftRate = scenario === 'bau' ? 0.08 : 0.015;

    return years.map(y => {
      const step = y - 2024;
      // 使用缓动函数模拟逐渐饱和的演化
      const convergenceFactor = 1 - Math.pow(1 - baseDriftRate, step);
      
      let totalRisk = 0;

      // 动态生境坐标
      const dynamicHabitats = habitatData.map(h => {
        // 核心污染源不移动，只有自然生境被拉扯
        const currentPC1 = h.isCore ? h.basePC1 : h.basePC1 + (coreCentroid.pc1 - h.basePC1) * convergenceFactor;
        const currentPC2 = h.isCore ? h.basePC2 : h.basePC2 + (coreCentroid.pc2 - h.basePC2) * convergenceFactor;
        
        // 计算当前离高危中心的距离 (用于计算风险)
        const distToCore = Math.sqrt(Math.pow(currentPC1 - coreCentroid.pc1, 2) + Math.pow(currentPC2 - coreCentroid.pc2, 2));
        const riskScore = h.isCore ? 100 : Math.max(0, 100 - (distToCore * 150)); // 转换系数 150 视具体坐标范围而定
        
        if (!h.isCore) totalRisk += riskScore;

        return { ...h, currentPC1, currentPC2, riskScore };
      });

      // 动态亚生境风险排行 (取 Top 5)
      const dynamicSubHabitats = subHabitatData
        .filter(s => !['Sewage', 'WWTP'].includes(s.mainHab)) // 只看易感环境
        .map(s => {
          const cPC1 = s.basePC1 + (coreCentroid.pc1 - s.basePC1) * convergenceFactor;
          const cPC2 = s.basePC2 + (coreCentroid.pc2 - s.basePC2) * convergenceFactor;
          const dist = Math.sqrt(Math.pow(cPC1 - coreCentroid.pc1, 2) + Math.pow(cPC2 - coreCentroid.pc2, 2));
          return { name: s.name, risk: Math.max(0, 100 - (dist * 150)), color: HABITAT_COLORS[s.mainHab] || '#94a3b8' };
        })
        .sort((a, b) => b.risk - a.risk)
        .slice(0, 5);

      const avgGlobalRisk = totalRisk / (habitatData.filter(h => !h.isCore).length || 1);

      return { 
        year: y, 
        habitats: dynamicHabitats, 
        subHabitats: dynamicSubHabitats,
        globalRisk: avgGlobalRisk 
      };
    });
  }, [habitatData, subHabitatData, coreCentroid, scenario]);

  // 当前年份状态
  const currentState = timelineData.find(d => d.year === year) || timelineData[0];

  // 图表数据提取
  const riskTrendData = timelineData.map(d => ({ year: d.year, risk: d.globalRisk }));

  // --- 3. 动画控制 ---
  useEffect(() => {
    let timer: number;
    if (isPlaying) {
      timer = window.setInterval(() => {
        setYear(prev => (prev >= 2035 ? 2024 : prev + 1));
      }, 600); // 每 0.6 秒一年
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  return (
    <div className="flex h-full w-full bg-[#020617] relative">
      
      {/* 绝对定位的 Header，防止遮挡图表 */}
      <div className="absolute top-8 left-8 z-10 pointer-events-none">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3 drop-shadow-lg">
          Global Resistome Trajectory <Activity className="text-cyan-400" />
        </h2>
        <p className="text-slate-400 text-xs mt-2 max-w-xl bg-slate-900/60 backdrop-blur-sm p-3 border-l-2 border-cyan-500 rounded">
          Simulating the potential evolutionary trajectory of the global resistome toward anthropogenic pollution sources using a Bray-Curtis spatial dynamics model (2024-2035).
        </p>
      </div>

      {/* Main Content Area - 分为左右两列 */}
      <div className="flex-1 pt-32 p-8 grid grid-cols-1 xl:grid-cols-12 gap-6 min-w-0 overflow-y-auto">
        
        {/* 左侧：主图 (PCoA Drift Map) 占据 7 列 */}
        <div className="xl:col-span-7 flex flex-col gap-6">
           <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 relative flex flex-col min-h-[450px]">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                 <GitMerge size={16} /> Niche Convergence Map
               </h3>
               <span className="text-2xl font-black font-mono text-white tracking-widest bg-slate-800 px-4 py-1 rounded-lg border border-slate-700 shadow-inner">
                 {year}
               </span>
             </div>
             
             <div className="flex-1 relative">
               <ResponsiveContainer width="100%" height="100%">
                 <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                   <XAxis type="number" dataKey="currentPC1" name="PC1" hide domain={['auto', 'auto']} />
                   <YAxis type="number" dataKey="currentPC2" name="PC2" hide domain={['auto', 'auto']} />
                   
                   {/* 绘制基准年份 (2024) 的阴影点作为参照物 */}
                   <Scatter data={timelineData[0].habitats} fill="#334155" shape="circle" />
                   
                   {/* 绘制当前模拟年份的动态点 */}
                   {currentState.habitats.map((hab) => (
                     <Scatter
                       key={hab.name}
                       name={hab.name}
                       data={[hab]}
                       fill={HABITAT_COLORS[hab.name] || '#94a3b8'}
                       shape={hab.isCore ? "triangle" : "circle"}
                       opacity={0.9}
                     />
                   ))}
                   
                   <RechartsTooltip 
                     cursor={{ strokeDasharray: '3 3', stroke: '#334155' }}
                     content={({ active, payload }) => {
                       if (active && payload && payload.length) {
                         const d = payload[0].payload;
                         return (
                           <div className="bg-slate-950 border border-slate-700 p-3 rounded shadow-xl text-xs">
                             <p className="font-bold mb-1" style={{color: HABITAT_COLORS[d.name] || '#fff'}}>{d.name}</p>
                             <p className="text-slate-400">Risk Score: <span className="text-white">{d.riskScore.toFixed(1)}</span>/100</p>
                             {d.isCore && <p className="text-red-400 mt-1 italic text-[10px]">* Pollution Core Hub</p>}
                           </div>
                         );
                       }
                       return null;
                     }}
                   />
                 </ScatterChart>
               </ResponsiveContainer>
               
               {/* 高危引力场背景提示 */}
               <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-5">
                 <Target size={300} className="text-red-500" />
               </div>
             </div>
             
             <div className="mt-4 flex gap-6 text-[10px] text-slate-500 justify-center">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#334155]" /> 2024 Baseline Position</span>
                <span className="flex items-center gap-2"><div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-red-500" /> Core Pollution Hub</span>
             </div>
           </div>
        </div>

        {/* 右侧：折线图与条形图 占据 5 列 */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          
          {/* Global Homogenization Index */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 h-64 flex flex-col">
            <h3 className="text-sm font-bold uppercase tracking-widest text-fuchsia-400 flex items-center gap-2 mb-4">
              <Thermometer size={16} /> Global Homogenization Index
            </h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={riskTrendData}>
                  <defs>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d946ef" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" stroke="#475569" fontSize={10} tickMargin={10} />
                  <YAxis stroke="#475569" fontSize={10} domain={[0, 100]} hide />
                  <RechartsTooltip contentStyle={{backgroundColor: '#020617', border: '1px solid #1e293b'}} itemStyle={{color: '#fuchsia'}}/>
                  <Area type="monotone" dataKey="risk" stroke="#d946ef" strokeWidth={3} fillOpacity={1} fill="url(#colorRisk)" />
                  <ReferenceLine x={year} stroke="#fbbf24" strokeDasharray="3 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sub-habitat Vulnerability Radar/Bar */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex-1 flex flex-col">
            <h3 className="text-sm font-bold uppercase tracking-widest text-orange-400 flex items-center gap-2 mb-4">
              <AlertTriangle size={16} /> Vulnerable Sub-Habitats ({year})
            </h3>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentState.subHabitats} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="name" width={100} stroke="#cbd5e1" fontSize={10} tickLine={false} axisLine={false} />
                  <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#020617', borderColor: '#1e293b'}}/>
                  <Bar dataKey="risk" radius={[0, 4, 4, 0]} barSize={16}>
                     {currentState.subHabitats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center">Top 5 sub-habitats predicted to be contaminated by resistance cores.</p>
          </div>
        </div>
      </div>

      {/* 极右侧：控制面板面板 */}
      <div className="w-72 flex-shrink-0 bg-slate-950/90 backdrop-blur-md border-l border-slate-800 p-6 pt-28 flex flex-col gap-8 z-20 shadow-2xl">
        
        {/* Playback Control */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
              isPlaying 
              ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20' 
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/20'
            }`}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            {isPlaying ? 'PAUSE SIMULATION' : 'START SIMULATION'}
          </button>
          <div className="mt-4 flex items-center gap-2">
             <input 
                type="range" min="2024" max="2035" step="1" 
                value={year}
                onChange={(e) => { setIsPlaying(false); setYear(parseInt(e.target.value)); }}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
             />
          </div>
        </div>

        {/* Scenario Selector */}
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
            Intervention Model
          </h4>
          <div className="flex flex-col gap-3">
             <div 
               onClick={() => setScenario('bau')}
               className={`p-3 rounded-xl border cursor-pointer transition-all ${scenario === 'bau' ? 'bg-red-950/30 border-red-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
             >
                <div className="flex items-center gap-2 mb-1">
                   <AlertTriangle size={14} className={scenario === 'bau' ? 'text-red-400' : 'text-slate-500'}/>
                   <span className={`text-xs font-bold ${scenario === 'bau' ? 'text-red-400' : 'text-slate-400'}`}>Business As Usual</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">Current antibiotic usage trends continue, leading to rapid environmental assimilation.</p>
             </div>

             <div 
               onClick={() => setScenario('one_health')}
               className={`p-3 rounded-xl border cursor-pointer transition-all ${scenario === 'one_health' ? 'bg-emerald-950/30 border-emerald-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
             >
                <div className="flex items-center gap-2 mb-1">
                   <ShieldCheck size={14} className={scenario === 'one_health' ? 'text-emerald-400' : 'text-slate-500'}/>
                   <span className={`text-xs font-bold ${scenario === 'one_health' ? 'text-emerald-400' : 'text-slate-400'}`}>One Health Policy</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">Strict global regulation on agricultural and clinical antibiotic emissions.</p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TrendsView;
