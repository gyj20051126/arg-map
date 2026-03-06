import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';

// Imports from split files
import { Sample } from './types';
import { getCorrectedCoordinates } from './utils';
import Navbar from './Navbar';
import AIChat from './components/AIChat'; // 假设你保留了这个组件
import LandingPage from './views/LandingPage';
import MapView from './views/MapView';
import PCoAView from './views/PCoAView'; // 确保你有这个文件，没有的话可以暂时注释
import TrendsView from './views/TrendsView'; // 确保你有这个文件，没有的话可以暂时注释

const Dashboard = ({ activeView, onViewChange, data }: { activeView: string, onViewChange: (view: any) => void, data: Sample[] }) => {
  return (
    <div className="relative w-full h-full flex flex-col">
      {activeView === 'map' && <MapView data={data} />}
      {activeView === 'pcoa' && <PCoAView data={data} />}
      {activeView === 'trends' && <TrendsView data={data} />}
    </div>
  );
};

const App = () => {
  const [view, setView] = useState<'landing' | 'map' | 'pcoa' | 'trends'>('landing');
  const [baseData, setBaseData] = useState<Sample[]>([]);
  const [userData, setUserData] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);

  // Combined data for views to consume
  const data = useMemo(() => [...baseData, ...userData], [baseData, userData]);

  useEffect(() => {
    setLoading(true);
    // 1. 修改：读取新的文件名
    fetch('/global_map_data.csv')
      .then(response => {
        if (!response.ok) throw new Error('Failed to load data file');
        return response.text();
      })
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedData = results.data
              // 2. 修改：同时兼容 index (新数据) 和 Sample_ID (旧数据)
              .filter((item: any) => (item.index || item.Sample_ID) && item.Habitats)
              .map((item: any) => {
                // 计算坐标 (新数据没有Lat/Lng列，全靠 getCorrectedCoordinates 从 Region 推导)
                const coords = getCorrectedCoordinates(item);
                
                return {
                  // 3. 修改：适配新CSV的列名
                  id: String(item.index || item.Sample_ID), 
                  // 兼容大小写 pc1/PC1
                  pc1: Number(item.pc1 !== undefined ? item.pc1 : item.PC1),
                  pc2: Number(item.pc2 !== undefined ? item.pc2 : item.PC2),
                  habitats: item.Habitats,
                  continents: item.Continents,
                  regions: item.Regions,
                  lat: coords.lat,
                  lng: coords.lng,
                  isUserUploaded: false
                };
              });
            
            console.log("Data Loaded:", parsedData.length, "samples");
            setBaseData(parsedData);
            setLoading(false);
          },
          error: (err) => {
            console.error("CSV Load Error:", err);
            setLoading(false);
          }
        });
      })
      .catch(err => {
        console.error("Fetch Error:", err);
        setLoading(false);
      });
  }, []);

  const handleUserUpload = (file: File) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedUserData = results.data
          .filter((item: any) => item.Sample_ID || item.id || item.index)
          .map((item: any) => {
            const coords = getCorrectedCoordinates(item);
            return {
              id: String(item.Sample_ID || item.id || item.index || `User_${Math.random()}`),
              pc1: Number(item.PC1 || item.pc1 || 0),
              pc2: Number(item.PC2 || item.pc2 || 0),
              habitats: item.Habitats || item.habitats || 'Unknown',
              continents: item.Continents || item.continents || 'Unknown',
              regions: item.Regions || item.regions || 'Unknown',
              lat: coords.lat,
              lng: coords.lng,
              isUserUploaded: true
            };
          });
        
        if (parsedUserData.length > 0) {
          setUserData(parsedUserData);
          setView('pcoa'); 
        } else {
          alert('No valid data found. Please check CSV format.');
        }
      },
      error: (err) => {
        console.error(err);
      }
    });
  };

  const handleClearUserData = () => {
    setUserData([]);
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#050A18] flex items-center justify-center flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
        <div className="text-cyan-500 font-mono text-sm tracking-widest animate-pulse">INITIALIZING ARG DATABASE...</div>
      </div>
    );
  }

  return (
    <div className="bg-[#050A18] text-white h-screen w-full overflow-hidden font-sans selection:bg-cyan-500/30 flex flex-col relative">
      <Navbar 
        onViewChange={setView} 
        currentView={view} 
        onUpload={handleUserUpload}
        onClear={handleClearUserData}
        hasUserData={userData.length > 0}
      />
      
      {/* 只有当你需要AI聊天时保留 */}
      <div className="hidden md:block">
         <AIChat />
      </div>

      <AnimatePresence mode="wait">
        {view === 'landing' ? (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10">
            <LandingPage onExplore={() => setView('map')} data={data} />
          </motion.div>
        ) : (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-0">
            <Dashboard activeView={view} onViewChange={setView} data={data} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
