// client/src/pages/tianyige/types/index.ts

export interface PlanetData {
  id: string;
  name: string;
  englishName: string;
  color: string;
  size: number;
  distance: number;
  speed: number;
  description: string;
  textureUrl?: string;
  nightTextureUrl?: string;
  atmosphereUrl?: string;
  ringTextureUrl?: string;
  cloudUrl?: string;           // 新增：云层纹理
  hasRing?: boolean;
  emissive?: boolean;
  mass?: string;
  temp?: string;
  orbitalPeriod?: string;
  rotationPeriod?: string;
}