
// --- CONSTANTS & DATA ---

export const REGION_LOOKUP: Record<string, { lat: number, lng: number }> = {
  'USA': { lat: 37.0902, lng: -95.7129 },
  'Canada': { lat: 56.1304, lng: -106.3468 },
  'China': { lat: 35.8617, lng: 104.1954 },
  'Japan': { lat: 36.2048, lng: 138.2529 },
  'South Korea': { lat: 35.9078, lng: 127.7669 },
  'Israel': { lat: 31.0461, lng: 34.8516 },
  'India': { lat: 20.5937, lng: 78.9629 },
  'Singapore': { lat: 1.3521, lng: 103.8198 },
  'Vietnam': { lat: 14.0583, lng: 108.2772 },
  'Malaysia': { lat: 4.2105, lng: 101.9758 },
  'Nepal': { lat: 28.3949, lng: 84.1240 },
  'Pakistan': { lat: 30.3753, lng: 69.3451 },
  'Kazakhstan': { lat: 48.0196, lng: 66.9237 },
  'Cambodia ': { lat: 12.5657, lng: 104.9910 },
  'Spain': { lat: 40.4637, lng: -3.7492 },
  'Germany': { lat: 51.1657, lng: 10.4515 },
  'Sweden': { lat: 60.1282, lng: 18.6435 },
  'Norway': { lat: 60.4720, lng: 8.4689 },
  'Denmark': { lat: 56.2639, lng: 9.5018 },
  'UK': { lat: 55.3781, lng: -3.4360 },
  'Ireland': { lat: 53.1424, lng: -7.6921 },
  'Netherlands': { lat: 52.1326, lng: 5.2913 },
  'France': { lat: 46.2276, lng: 2.2137 },
  'Italy': { lat: 41.8719, lng: 12.5674 },
  'Greece': { lat: 39.0742, lng: 21.8243 },
  'Switzerland': { lat: 46.8182, lng: 8.2275 },
  'Austria': { lat: 47.5162, lng: 14.5501 },
  'Czech Republic': { lat: 49.8175, lng: 15.4730 },
  'Hungary': { lat: 47.1625, lng: 19.5033 },
  'Poland': { lat: 51.9194, lng: 19.1451 },
  'Finland': { lat: 61.9241, lng: 25.7482 },
  'Bulgaria': { lat: 42.7339, lng: 25.4858 },
  'Serbia': { lat: 44.0165, lng: 21.0059 },
  'Russia': { lat: 61.5240, lng: 105.3188 },
  'South Africa': { lat: -30.5595, lng: 22.9375 },
  'Egypt': { lat: 26.8206, lng: 30.8025 },
  'Nigeria': { lat: 9.0820, lng: 8.6753 },
  'Kenya': { lat: -0.0236, lng: 37.9062 },
  'Tanzania': { lat: -6.3690, lng: 34.8888 },
  'Zambia': { lat: -13.1339, lng: 27.8493 },
  'Senegal': { lat: 14.4974, lng: -14.4524 },
  'Gabon': { lat: -0.8037, lng: 11.6094 },
  'Brazil': { lat: -14.2350, lng: -51.9253 },
  'Peru': { lat: -9.1900, lng: -75.0152 },
  'Argentina': { lat: -38.4161, lng: -63.6167 },
  'Ecuador ': { lat: -1.8312, lng: -78.1834 },
  'El Salvador': { lat: 13.7942, lng: -88.8965 },
  'Australia': { lat: -25.2744, lng: 133.7751 },
  'New Zealand': { lat: -40.9006, lng: 174.8860 },
  'Antarctica': { lat: -82.8628, lng: 135.0000 },
};

export const HABITAT_COLORS: Record<string, string> = {
  'Soil': '#22d3ee',          // Cyan (Tech/Bio)
  'Human_feces': '#f43f5e',   // Red
  'Chicken_feces': '#fb923c', // Orange
  'Cattle_feces': '#a78bfa',  // Violet
  'Swine_feces': '#f472b6',   // Pink
  'Drinking_water': '#38bdf8',// Sky Blue
  'Marine_water': '#3b82f6',  // Blue
  'Natural_water': '#4ade80', // Green
  'Natural_sediment': '#84cc16', // Lime
  'WWTP': '#94a3b8',          // Slate
  'Industrial_WWTP': '#64748b', // Dark Slate
  'Sewage': '#60a5fa',        // Bright Blue
  'Landfill': '#a8a29e',      // Stone
  'Air': '#bae6fd',           // Light Blue
};

export const CONTINENT_COLORS: Record<string, string> = {
  'North America': '#3b82f6', // Blue
  'South America': '#22c55e', // Green
  'Europe': '#f59e0b',        // Amber
  'Africa': '#ef4444',        // Red
  'Asia': '#a855f7',          // Purple
  'Australia': '#06b6d4',     // Cyan
  'Oceania': '#06b6d4',       // Cyan (Alt)
  'Antarctica': '#e2e8f0',    // Slate
};

export const USER_DATA_COLOR = '#f0abfc'; // Neon Fuchsia

// --- TYPES ---

export interface Sample {
  id: string;
  pc1: number;
  pc2: number;
  habitats: string;
  continents: string;
  regions: string;
  lat: number;
  lng: number;
  isUserUploaded?: boolean;
  [key: string]: any;
}
