import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, MapPin, Layers, Database, X } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { Sample, HABITAT_COLORS, USER_DATA_COLOR } from '../types';

const LandingGlobe3D = ({ data }: { data: Sample[] }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 保护：如果没有挂载点则不执行
    if (!mountRef.current) return;
    
    // 如果数据还没加载好，可以渲染一个空的地球，这里允许 data 为空数组继续渲染基础地球
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050a18, 0.0015);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.z = 220;
    camera.position.y = 40;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const baseRadius = 80;

    const globeGeo = new THREE.SphereGeometry(baseRadius - 0.5, 64, 64);
    const globeMat = new THREE.MeshPhongMaterial({ 
      color: 0x02040a, 
      emissive: 0x061229,
      emissiveIntensity: 0.2,
      specular: 0x111111,
      shininess: 10,
      transparent: true,
      opacity: 0.95
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globeMesh);

    const atmosphereGeo = new THREE.SphereGeometry(baseRadius + 15, 64, 64);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 4.0);
          gl_FragColor = vec4(0.13, 0.82, 0.93, 1.0) * intensity * 0.8;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true
    });
    const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    scene.add(atmosphere);

    // --- Data Particles ---
    const particlePositions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];

    // 性能优化：如果数据太多，着陆页只显示部分
    const displayData = data.length > 2000 ? data.slice(0, 2000) : data;

    displayData.forEach(d => {
      // 只有当有有效坐标时才渲染
      if (d.lat !== 0 || d.lng !== 0) {
        const phi = (90 - d.lat) * (Math.PI / 180);
        const theta = (d.lng + 180) * (Math.PI / 180);

        const x = -(baseRadius * Math.sin(phi) * Math.cos(theta));
        const z = (baseRadius * Math.sin(phi) * Math.sin(theta));
        const y = (baseRadius * Math.cos(phi));

        particlePositions.push(x, y, z);
        
        const hexColor = d.isUserUploaded ? USER_DATA_COLOR : (HABITAT_COLORS[d.habitats] || '#ffffff');
        const color = new THREE.Color(hexColor);
        colors.push(color.r, color.g, color.b);
        sizes.push(Math.random() * 0.8 + 0.4);
      }
    });

    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
    particlesGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    particlesGeo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const particlesMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (400.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float r = distance(gl_PointCoord, vec2(0.5));
          if (r > 0.5) discard;
          gl_FragColor = vec4(vColor, 0.8);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x22d3ee, 1.5, 200);
    pointLight.position.set(50, 50, 150);
    scene.add(pointLight);

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      particlesMat.uniforms.uTime.value += 0.01;
      const rotationSpeed = 0.0008;
      particles.rotation.y += rotationSpeed;
      globeMesh.rotation.y += rotationSpeed;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
      particlesGeo.dispose();
      particlesMat.dispose();
      globeGeo.dispose();
      globeMat.dispose();
    };
  }, [data]);

  return <div ref={mountRef} className="w-full h-full absolute inset-0 z-0" />;
};

const StatCard = ({ title, value, icon: Icon, subtext, onClick, active }: { title: string, value: string | number, icon: any, subtext?: string, onClick?: () => void, active?: boolean }) => (
  <motion.div 
    onClick={onClick}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
    className={`cursor-pointer backdrop-blur-xl border p-6 rounded-none border-l-2 flex flex-col gap-3 min-w-[260px] transition-all duration-300 group
      ${active ? 'bg-white/10 border-white/20 border-l-cyan-400' : 'bg-[#0a1025]/60 border-white/5 border-l-transparent hover:border-l-cyan-400/50'}
    `}
  >
    <div className="flex items-center justify-between">
      <div className={`p-2 rounded-md transition-colors ${active ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-slate-400 group-hover:text-cyan-400'}`}>
        <Icon size={20} />
      </div>
      {subtext && <span className="text-[10px] uppercase tracking-wider text-cyan-500/80 bg-cyan-950/30 px-2 py-1 rounded-sm border border-cyan-900/50">{subtext}</span>}
    </div>
    
    <div>
      <div className="text-3xl font-light text-white tracking-tight font-sans">{value}</div>
      <div className="text-[11px] text-slate-500 font-bold tracking-[0.2em] uppercase mt-1 group-hover:text-slate-300 transition-colors">{title}</div>
    </div>
    
    <div className="flex items-center gap-2 text-[10px] text-slate-600 mt-2 group-hover:text-cyan-400/80 transition-colors">
      <span>View Analysis</span> <ChevronRight size={12} />
    </div>
  </motion.div>
);

const FeatureModal = ({ feature, onClose, data }: { feature: string | null, onClose: () => void, data: Sample[] }) => {
  if (!feature) return null;

  const content = useMemo(() => {
    if (feature === 'coverage') {
      const regionCounts: Record<string, number> = {};
      data.forEach(d => { regionCounts[d.regions] = (regionCounts[d.regions] || 0) + 1; });
      const chartData = Object.entries(regionCounts)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }));
        
      return {
        title: "Global Coverage",
        subtitle: "Geographic distribution of metagenomic sampling sites.",
        chart: (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.3} />
              <XAxis type="number" stroke="#64748b" tick={{fontSize: 10}} />
              <YAxis type="category" dataKey="name" width={100} stroke="#94a3b8" tick={{fontSize: 11}} />
              <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{background: '#0f172a', border: '1px solid #1e293b', color: '#fff'}} />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        ),
        stats: [
          { label: "Top Region", value: chartData[0]?.name },
          { label: "Regions Covered", value: Object.keys(regionCounts).length },
          { label: "Avg Samples/Region", value: Math.round(data.length / Object.keys(regionCounts).length) }
        ]
      };
    } 
    else if (feature === 'niche') {
      const habCounts: Record<string, number> = {};
      data.forEach(d => { habCounts[d.habitats] = (habCounts[d.habitats] || 0) + 1; });
      const chartData = Object.entries(habCounts)
        .map(([name, value]) => ({ name: name.replace('_', ' '), value }))
        .sort((a,b) => b.value - a.value);

      return {
        title: "Ecological Habitats",
        subtitle: "Diversity of environmental reservoirs analyzed.",
        chart: (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={HABITAT_COLORS[entry.name.replace(' ', '_')] || '#fff'} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={{background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px'}} itemStyle={{color: '#fff'}} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px', opacity: 0.7}} />
            </PieChart>
          </ResponsiveContainer>
        ),
        stats: [
          { label: "Dominant Habitat", value: chartData[0]?.name },
          { label: "Unique Habitats", value: chartData.length },
          { label: "Diversity Index", value: "High" }
        ]
      };
    }
    else {
      // 保护：如果pc1数据不足
      const pc1Vals = data.map(d => d.pc1).filter(v => !isNaN(v)).sort((a,b) => a-b);
      const bins = 20;
      const min = pc1Vals.length ? pc1Vals[0] : 0;
      const max = pc1Vals.length ? pc1Vals[pc1Vals.length-1] : 0;
      const step = (max - min) / bins || 1;
      
      const histData = Array(bins).fill(0).map((_, i) => ({ 
        range: (min + i*step).toFixed(1), 
        count: 0 
      }));
      pc1Vals.forEach(v => {
        const idx = Math.min(Math.floor((v - min) / step), bins - 1);
        if (histData[idx]) histData[idx].count++;
      });

      return {
        title: "Genomic Database",
        subtitle: "Comprehensive metagenomic sampling depth.",
        chart: (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={histData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
              <XAxis dataKey="range" tick={{fontSize: 10}} stroke="#64748b" interval={4} />
              <YAxis stroke="#64748b" tick={{fontSize: 10}} />
              <Tooltip contentStyle={{background: '#0f172a', border: '1px solid #1e293b'}} />
              <Area type="monotone" dataKey="count" stroke="#22d3ee" fillOpacity={1} fill="url(#colorCount)" />
            </AreaChart>
          </ResponsiveContainer>
        ),
        stats: [
          { label: "Total Samples", value: data.length },
          { label: "Dataset Size", value: "~4.2 GB" },
          { label: "Last Updated", value: "2024.05" }
        ]
      };
    }
  }, [feature, data]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="absolute top-24 bottom-24 right-8 w-[400px] bg-[#0a1025]/90 backdrop-blur-xl border border-white/10 border-t-cyan-500/50 border-t-2 shadow-2xl z-40 p-8 flex flex-col pointer-events-auto"
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-light text-white tracking-wide">{content.title}</h2>
          <p className="text-slate-400 text-xs mt-1 leading-relaxed">{content.subtitle}</p>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 min-h-0 mb-6">
        {content.chart}
      </div>

      <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-6">
        {content.stats.map((s, i) => (
          <div key={i}>
            <div className="text-lg font-bold text-white font-mono">{s.value}</div>
            <div className="text-[10px] text-cyan-500/70 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const LandingPage = ({ onExplore, data }: { onExplore: () => void, data: Sample[] }) => {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  
  const stats = useMemo(() => {
    if (!data.length) return { total: 0, regions: 0, topHabitat: 'N/A' };
    const regions = new Set(data.map(d => d.regions)).size;
    
    const habitatCounts: Record<string, number> = {};
    data.forEach(d => { habitatCounts[d.habitats] = (habitatCounts[d.habitats] || 0) + 1; });
    const topHabitat = Object.entries(habitatCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { total: data.length, regions, topHabitat: topHabitat.replace('_', ' ') };
  }, [data]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050A18]">
      <LandingGlobe3D data={data} />
      <div className="absolute inset-0 z-20 flex flex-col pointer-events-none">
        <div className="flex-1 flex flex-col items-center justify-center -mt-20 pointer-events-auto">
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="text-center relative"
          >
            <div className="text-xs font-mono text-cyan-500 tracking-[0.8em] uppercase mb-4 opacity-70">
              Planetary ARG Monitoring
            </div>
            <h1 className="text-8xl md:text-9xl font-thin text-white tracking-tighter leading-none mb-6 mix-blend-screen">
              ARG MAP
            </h1>
            <div className="absolute -left-12 top-1/2 w-8 h-[1px] bg-white/20"></div>
            <div className="absolute -right-12 top-1/2 w-8 h-[1px] bg-white/20"></div>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onExplore}
              className="mt-8 px-8 py-3 bg-white text-[#050A18] text-sm font-bold tracking-[0.2em] uppercase hover:bg-cyan-400 transition-colors duration-300"
            >
              Enter System
            </motion.button>
          </motion.div>
        </div>

        <div className="w-full px-12 pb-12 pointer-events-auto z-30">
          <div className="flex flex-wrap justify-center gap-6 max-w-7xl mx-auto">
            <StatCard 
              title="Global Coverage" 
              value={stats.regions} 
              icon={MapPin} 
              subtext="Regions"
              onClick={() => setSelectedFeature('coverage')}
              active={selectedFeature === 'coverage'}
            />
            <StatCard 
              title="Ecological Habitats" 
              value={stats.topHabitat} 
              icon={Layers} 
              subtext="Primary Reservoir"
              onClick={() => setSelectedFeature('niche')}
              active={selectedFeature === 'niche'}
            />
            <StatCard 
              title="Genomic Database" 
              value={stats.total} 
              icon={Database} 
              subtext="Total Samples"
              onClick={() => setSelectedFeature('database')}
              active={selectedFeature === 'database'}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedFeature && (
          <FeatureModal 
            feature={selectedFeature} 
            data={data} 
            onClose={() => setSelectedFeature(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
