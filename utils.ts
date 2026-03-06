import { REGION_LOOKUP, CONTINENT_COLORS } from './types';

// Helper to determine lat/lng from data, using lookup if 0,0 or missing
export const getCorrectedCoordinates = (s: any) => {
  // 1. 尝试从 CSV 读取 (兼容 Lat, lat, Latitude 等)
  let lat = parseFloat(s.Lat || s.lat || s.Latitude);
  let lng = parseFloat(s.Lng || s.lng || s.Longitude);
  
  // 2. 检查是否无效 (NaN) 或者是否是占位符 (0,0)
  // 你的新数据没有 Lat/Lng 列，所以这里通常会是 NaN
  const isInvalid = isNaN(lat) || isNaN(lng) || (Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001);

  if (isInvalid && s.Regions) {
    // 3. 尝试去除空格匹配
    const regionKey = s.Regions.trim();
    if (REGION_LOOKUP[regionKey]) {
      lat = REGION_LOOKUP[regionKey].lat;
      lng = REGION_LOOKUP[regionKey].lng;
    } else {
      // 调试：如果找不到这个国家，控制台打印一下，方便后续添加进 lookup
      // console.warn(`Region lookup missing for: ${regionKey}`);
      // 默认给个 0,0 或者一个备用值，防止报错
      lat = 0;
      lng = 0;
    }
  }
  return { lat: lat || 0, lng: lng || 0 };
};

export const getContinentColor = (continent: string) => {
  return CONTINENT_COLORS[continent] || '#ffffff';
};