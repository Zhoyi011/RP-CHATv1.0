// client/src/components/tianyige/PlanetLODWithTime.tsx
// 支持时间引擎的LOD行星组件

import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { LOD } from '@react-three/drei';
import * as THREE from 'three';
import type { PlanetData } from '../../pages/tianyige/types';
import type { TimeEngineState } from '../../hooks/useTimeEngine';

interface PlanetLODWithTimeProps {
  data: PlanetData;
  onSelect: (id: string) => void;
  isSelected: boolean;
  quality: 'low' | 'medium' | 'high';
  globalPositionsRef: React.MutableRefObject<Record<string, THREE.Vector3>>;
  showOrbit: boolean;
  isPaused: boolean;
  textureManager?: any;
  timeEngineState?: TimeEngineState;
  calculatePlanetPosition?: (
    planetDistance: number,
    planetSpeed: number,
    currentTime: number
  ) => { x: number; z: number };
}

/**
 * 低细节行星组件（支持时间引擎）
 */
const PlanetLowWithTime: React.FC<PlanetLODWithTimeProps> = ({ 
  data, onSelect, isSelected, timeEngineState, calculatePlanetPosition 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const orbitRef = useRef<THREE.Group>(null);
  
  // 低细节材质
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

  // 低细节几何体
  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(data.size, 8, 6);
  }, [data.size]);

  // 更新行星位置（基于时间引擎）
  useFrame((state) => {
    if (!meshRef.current || data.id === 'sun') return;
    
    if (calculatePlanetPosition && timeEngineState) {
      const currentTime = timeEngineState.currentDate.getTime() / 1000;
      const position = calculatePlanetPosition(data.distance, data.speed, currentTime);
      
      meshRef.current.position.set(position.x, 0, position.z);
      
      // 更新全局位置引用
      if (globalPositionsRef) {
        globalPositionsRef.current[data.id] = meshRef.current.position.clone();
      }
    }
  });

  return (
    <group ref={orbitRef}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        onClick={(e) => { e.stopPropagation(); onSelect(data.id); }}
        castShadow={false}
        receiveShadow={false}
      />
    </group>
  );
};

/**
 * 中等细节行星组件（支持时间引擎）
 */
const PlanetMediumWithTime: React.FC<PlanetLODWithTimeProps> = ({ 
  data, onSelect, isSelected, quality, timeEngineState, calculatePlanetPosition 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const orbitRef = useRef<THREE.Group>(null);
  
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

  // 更新行星位置（基于时间引擎）
  useFrame((state) => {
    if (!meshRef.current || data.id === 'sun') return;
    
    if (calculatePlanetPosition && timeEngineState) {
      const currentTime = timeEngineState.currentDate.getTime() / 1000;
      const position = calculatePlanetPosition(data.distance, data.speed, currentTime);
      
      meshRef.current.position.set(position.x, 0, position.z);
      
      // 更新全局位置引用
      if (globalPositionsRef) {
        globalPositionsRef.current[data.id] = meshRef.current.position.clone();
      }
    }
  });

  return (
    <group ref={orbitRef}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        onClick={(e) => { e.stopPropagation(); onSelect(data.id); }}
        castShadow={quality === 'medium'}
        receiveShadow={quality === 'medium'}
      />
    </group>
  );
};

/**
 * 高细节行星组件（支持时间引擎）
 */
const PlanetHighWithTime: React.FC<PlanetLODWithTimeProps> = ({ 
  data, onSelect, isSelected, quality, textureManager, timeEngineState, calculatePlanetPosition 
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const orbitRef = useRef<THREE.Group>(null);
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

  // 更新行星位置（基于时间引擎）
  useFrame((state) => {
    if (!meshRef.current || data.id === 'sun') return;
    
    if (calculatePlanetPosition && timeEngineState) {
      const currentTime = timeEngineState.currentDate.getTime() / 1000;
      const position = calculatePlanetPosition(data.distance, data.speed, currentTime);
      
      meshRef.current.position.set(position.x, 0, position.z);
      
      // 更新全局位置引用
      if (globalPositionsRef) {
        globalPositionsRef.current[data.id] = meshRef.current.position.clone();
      }
    }
  });

  return (
    <group ref={orbitRef}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        onClick={(e) => { e.stopPropagation(); onSelect(data.id); }}
        castShadow={quality !== 'low'}
        receiveShadow={quality !== 'low'}
      />
    </group>
  );
};

/**
 * 主LOD行星组件（支持时间引擎）
 */
export const PlanetLODWithTime: React.FC<PlanetLODWithTimeProps> = (props) => {
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
    const baseDistances = {
      low: [30, 60, 100],
      medium: [40, 80, 120],
      high: [50, 100, 150],
    };
    
    return baseDistances[props.quality];
  }, [props.quality]);

  return (
    <group ref={groupRef}>
      <LOD
        levels={[
          { distance: lodDistances[0], element: <PlanetHighWithTime {...props} /> },
          { distance: lodDistances[1], element: <PlanetMediumWithTime {...props} /> },
          { distance: lodDistances[2], element: <PlanetLowWithTime {...props} /> },
        ]}
      />
    </group>
  );
};

/**
 * 简化的行星组件（支持时间引擎）
 */
export const SimplePlanetWithTime: React.FC<PlanetLODWithTimeProps> = ({
  data,
  onSelect,
  isSelected,
  quality,
  timeEngineState,
  calculatePlanetPosition,
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

  // 更新行星位置（基于时间引擎）
  useFrame((state) => {
    if (!meshRef.current || data.id === 'sun') return;
    
    if (calculatePlanetPosition && timeEngineState) {
      const currentTime = timeEngineState.currentDate.getTime() / 1000;
      const position = calculatePlanetPosition(data.distance, data.speed, currentTime);
      
      meshRef.current.position.set(position.x, 0, position.z);
      
      // 更新全局位置引用
      if (globalPositionsRef) {
        globalPositionsRef.current[data.id] = meshRef.current.position.clone();
      }
    }
  });

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