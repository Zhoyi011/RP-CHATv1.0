// client/src/pages/tianyige/types/index.ts

export interface PlanetData {
  id: string;
  name: string;
  englishName: string;
  color: string;
  size: number;
  distance: number;    // 若 orbits 为空，表示距太阳距离；若 orbits 有值，表示距母星距离
  speed: number;
  description: string;
  textureUrl?: string;
  nightTextureUrl?: string;
  atmosphereUrl?: string;
  ringTextureUrl?: string;
  cloudUrl?: string;
  hasRing?: boolean;
  emissive?: boolean;
  mass?: string;
  temp?: string;
  orbitalPeriod?: string;
  rotationPeriod?: string;
  
  // ✨ 新增：绕其公转的母星 ID（例如 "earth"），不填则默认绕太阳（原点）
  orbits?: string;
}