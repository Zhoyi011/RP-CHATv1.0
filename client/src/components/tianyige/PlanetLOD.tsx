// client/src/components/tianyige/PlanetLOD.tsx
// LOD（Level of Detail）行星组件

import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { LOD } from '@react-three/drei';
import * as THREE from 'three';
import type { PlanetData } from '../../pages/tianyige/types';

interface PlanetLODProps {
  data: PlanetData;
  onSelect: (id: string) => void;
  isSelected: boolean;
  quality: 'low' | 'medium' | 'high';
  globalPositionsRef: React.MutableRefObject<Record<string, THREE.Vector3>>;
  showOrbit: boolean;
  isPaused: boolean;
  textureManager?: any; // 可选的纹理管理器
}

/**
 * 低细节行星组件
 * 用于远距离渲染
 */
const PlanetLow: React.FC<PlanetLODProps> = ({ data, onSelect, isSelected }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // 低细节材质 - 使用纯色或简单纹理
  const material = useMemo(() => {
    if (data.id === 'sun') {
      return new THREE.MeshBasicMaterial({
        color: data.color,
        emissive: data.color,
        emissiveIntensity: 0.8,
      });
    }
    
    return new THREE.MeshLambertMaterial({
      color: data.color,
      emissive: data.emissive ? data.color : undefined,
      emissiveIntensity: data.emissive ? 0.3 : 0,
    });
  }, [data]);

  // 低细节几何体 - 分段数最少
  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(data.size, 8, 6);
  }, [data.size]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      onClick={(e) => { e.stopPropagation(); onSelect(data.id); }}
      castShadow={false}
      receiveShadow={false}
    />
  );
};

/**
 * 中等细节行星组件
 * 用于中等距离渲染
 */
const PlanetMedium: React.FC<PlanetLODProps> = ({ 
  data, onSelect, isSelected, quality 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // 中等细节材质
  const material = useMemo(() => {
    const props: THREE.MeshStandardMaterialParameters = {
      color: data.color,
      roughness: 0.6,
      metalness: 0.2,
    };
    
    return new THREE.MeshStandardMaterial(props);
  }, [data]);

  // 中等细节几何体
  const geometry = useMemo(() => {
    const segments = 16;
    return new THREE.SphereGeometry(data.size, segments, segments);
  }, [data.size]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      onClick={(e) => { e.stopPropagation(); onSelect(data.id); }}
      castShadow={quality === 'medium'}
      receiveShadow={quality === 'medium'}
    />
  );
};

/**
 * 高细节行星组件
 * 用于近距离渲染
 */
const PlanetHigh: React.FC<PlanetLODProps> = ({ 
  data, onSelect, isSelected, quality, textureManager 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = React.useState<THREE.Texture | null>(null);
  
  // 加载纹理
  useEffect(() => {
    if (!data.textureUrl) return;
    
    const loadTexture = async () => {
      try {
        if (textureManager) {
          const tex = await textureManager.loadTexture(data.textureUrl, quality);
          setTexture(tex);
        } else {
          // 备用加载方式
          const loader = new THREE.TextureLoader();
          loader.load(data.textureUrl, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            setTexture(tex);
          });
        }
      } catch (error) {
        console.error(`Failed to load texture for ${data.name}:`, error);
      }
    };
    
    loadTexture();
    
    return () => {
      if (texture) {
        texture.dispose();
      }
    };
  }, [data.textureUrl, quality, textureManager]);

  // 高细节材质
  const material = useMemo(() => {
    const props: THREE.MeshStandardMaterialParameters = {
      color: data.color,
      roughness: quality === 'high' ? 0.35 : 0.5,
      metalness: quality === 'high' ? 0.3 : 0.2,
    };
    
    if (texture) {
      props.map = texture;
    }
    
    if (data.id === 'sun') {
      return new THREE.MeshBasicMaterial({
        map: texture,
        color: 0xffdd99,
      });
    }
    
    return new THREE.MeshStandardMaterial(props);
  }, [data, quality, texture]);

  // 高细节几何体
  const geometry = useMemo(() => {
    const segments = quality === 'high' ? 32 : 24;
    return new THREE.SphereGeometry(data.size, segments, segments);
  }, [data.size, quality]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      onClick={(e) => { e.stopPropagation(); onSelect(data.id); }}
      castShadow={quality !== 'low'}
      receiveShadow={quality !== 'low'}
    />
  );
};

/**
 * 主LOD行星组件
 * 根据距离自动切换细节级别
 */
export const PlanetLOD: React.FC<PlanetLODProps> = (props) => {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const distanceRef = useRef<number>(0);
  
  // 更新距离
  useFrame(() => {
    if (groupRef.current) {
      distanceRef.current = groupRef.current.position.distanceTo(camera.position);
    }
  });

  // LOD距离配置
  const lodDistances = useMemo(() => {
    // 根据画质调整LOD距离
    const baseDistances = {
      low: [30, 60, 100],    // 低画质：更早降级
      medium: [40, 80, 120], // 中画质
      high: [50, 100, 150],  // 高画质：更晚降级
    };
    
    return baseDistances[props.quality];
  }, [props.quality]);

  return (
    <group ref={groupRef}>
      <LOD
        levels={[
          { distance: lodDistances[0], element: <PlanetHigh {...props} /> },
          { distance: lodDistances[1], element: <PlanetMedium {...props} /> },
          { distance: lodDistances[2], element: <PlanetLow {...props} /> },
        ]}
      />
    </group>
  );
};

/**
 * 优化的轨道渲染组件
 */
export const OptimizedOrbit: React.FC<{
  distance: number;
  quality: 'low' | 'medium' | 'high';
  color?: string;
}> = ({ distance, quality, color = '#22d3ee' }) => {
  const geometry = useMemo(() => {
    // 根据画质调整轨道分段数
    const segments = quality === 'high' ? 128 : quality === 'medium' ? 64 : 32;
    return new THREE.RingGeometry(distance - 0.08, distance + 0.08, segments);
  }, [distance, quality]);

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: quality === 'high' ? 0.15 : quality === 'medium' ? 0.1 : 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, [color, quality]);

  return (
    <mesh 
      geometry={geometry} 
      material={material} 
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, -0.02, 0]}
    />
  );
};

/**
 * 优化的选择高亮组件
 */
export const OptimizedSelectionGlow: React.FC<{
  size: number;
  quality: 'low' | 'medium' | 'high';
}> = ({ size, quality }) => {
  const glowRef = useRef<THREE.Mesh>(null);
  
  // 根据画质调整高亮细节
  const geometry = useMemo(() => {
    const segments = quality === 'high' ? 64 : quality === 'medium' ? 48 : 32;
    return new THREE.RingGeometry(size * 1.25, size * 1.35, segments);
  }, [size, quality]);

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#06b6d4',
      transparent: true,
      opacity: quality === 'high' ? 0.7 : quality === 'medium' ? 0.5 : 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, [quality]);

  // 脉动动画
  useFrame((state) => {
    if (glowRef.current && quality !== 'low') {
      const pulse = 1.0 + Math.sin(state.clock.getElapsedTime() * 2) * 0.05;
      glowRef.current.scale.set(pulse, pulse, 1);
    }
  });

  return (
    <mesh 
      ref={glowRef}
      geometry={geometry} 
      material={material} 
      rotation={[Math.PI / 2, 0, 0]}
    />
  );
};

/**
 * 简化的行星组件（无LOD，用于测试或简单场景）
 */
export const SimplePlanet: React.FC<PlanetLODProps> = ({
  data,
  onSelect,
  isSelected,
  quality,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // 根据画质选择细节级别
  const getSegments = () => {
    switch (quality) {
      case 'low': return 12;
      case 'medium': return 24;
      case 'high': return 32;
    }
  };

  const material = useMemo(() => {
    if (data.id === 'sun') {
      return new THREE.MeshBasicMaterial({
        color: data.color,
        emissive: data.color,
        emissiveIntensity: 0.9,
      });
    }
    
    return new THREE.MeshStandardMaterial({
      color: data.color,
      roughness: quality === 'high' ? 0.4 : quality === 'medium' ? 0.6 : 0.8,
      metalness: quality === 'high' ? 0.2 : quality === 'medium' ? 0.1 : 0,
    });
  }, [data, quality]);

  const geometry = useMemo(() => {
    const segments = getSegments();
    return new THREE.SphereGeometry(data.size, segments, segments);
  }, [data.size, quality]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      onClick={(e) => { e.stopPropagation(); onSelect(data.id); }}
      castShadow={quality !== 'low'}
      receiveShadow={quality !== 'low'}
    />
  );
};