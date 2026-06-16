// client/src/pages/tianyige/components/Planet.tsx

import React, { useRef, useMemo, useEffect } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { PlanetData } from "../types";

interface PlanetProps {
  data: PlanetData;
  onSelect: (id: string) => void;
  isSelected: boolean;
  quality: "low" | "medium" | "high";
  globalPositionsRef: React.MutableRefObject<Record<string, THREE.Vector3>>;
  showOrbit: boolean;
  isPaused: boolean;
}

// ============================================================
// 地球日夜混合 Shader
// ============================================================
const createEarthMaterial = (
  dayMap: THREE.Texture,
  nightMap: THREE.Texture,
  quality: "low" | "medium" | "high",
) => {
  const uniforms = {
    uDayTexture: { value: dayMap },
    uNightTexture: { value: nightMap },
    uGlowIntensity: { value: quality === "high" ? 0.7 : quality === "medium" ? 0.5 : 0.3 },
  };

  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `;

  const fragmentShader = `
    uniform sampler2D uDayTexture;
    uniform sampler2D uNightTexture;
    uniform float uGlowIntensity;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
      vec3 lightDir = normalize(-vWorldPosition);
      float NdotL = dot(vNormal, lightDir);

      float dayMix = smoothstep(-0.1, 0.3, NdotL);

      vec4 dayColor = texture2D(uDayTexture, vUv);
      vec4 nightColor = texture2D(uNightTexture, vUv);

      vec4 finalColor = mix(nightColor, dayColor, dayMix);

      float fresnel = pow(1.0 - abs(dot(vNormal, normalize(vWorldPosition))), 2.5);
      vec3 glowColor = vec3(0.3, 0.6, 1.0) * fresnel * uGlowIntensity;
      finalColor.rgb += glowColor;

      gl_FragColor = finalColor;
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
  });
};

// ============================================================
// 生成太阳光晕纹理
// ============================================================
const createGlowTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  // 径向渐变核心光晕（无射线）
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255, 220, 150, 1)');
  gradient.addColorStop(0.1, 'rgba(255, 200, 100, 0.8)');
  gradient.addColorStop(0.3, 'rgba(255, 160, 60, 0.4)');
  gradient.addColorStop(0.6, 'rgba(255, 100, 20, 0.15)');
  gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

// ============================================================
// Planet 主组件
// ============================================================
export const Planet: React.FC<PlanetProps> = ({
  data,
  onSelect,
  isSelected,
  quality,
  globalPositionsRef,
  showOrbit,
  isPaused,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const atmoRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const angleRef = useRef<number>(Math.random() * Math.PI * 2);

  const texturesRef = useRef<THREE.Texture[]>([]);
  const materialsRef = useRef<THREE.Material[]>([]);
  const geometriesRef = useRef<THREE.BufferGeometry[]>([]);

  const loadTexture = (url: string | undefined): THREE.Texture | null => {
    if (!url) return null;
    try {
      const texture = useLoader(THREE.TextureLoader, url);
      texture.colorSpace = THREE.SRGBColorSpace;
      texturesRef.current.push(texture);
      return texture;
    } catch {
      return null;
    }
  };

  const colorMap = loadTexture(data.textureUrl);
  const nightMap = loadTexture(data.nightTextureUrl);
  const atmosphereMap = loadTexture(data.atmosphereUrl);
  const ringMap = loadTexture(data.ringTextureUrl);
  const sunTexture = data.id === "sun" ? loadTexture(data.textureUrl) : null;

  const glowTexture = useMemo(() => createGlowTexture(), []);

  const materialProps = useMemo(() => ({
    roughness: quality === "high" ? 0.35 : quality === "medium" ? 0.5 : 0.7,
    metalness: quality === "high" ? 0.3 : quality === "medium" ? 0.2 : 0.1,
  }), [quality]);

  const segments = quality === "high" ? 96 : quality === "medium" ? 48 : 24;

  const planetMaterial = useMemo(() => {
    let material: THREE.Material;

    if (data.id === "earth" && colorMap && nightMap) {
      material = createEarthMaterial(colorMap, nightMap, quality);
    } else if (data.id === "sun" && sunTexture) {
      // ✅ 太阳使用 MeshBasicMaterial
      material = new THREE.MeshBasicMaterial({
        map: sunTexture,
        color: 0xffdd99,
      });
    } else if (colorMap && data.id !== "sun") {
      const options: THREE.MeshStandardMaterialParameters = {
        map: colorMap,
        roughness: materialProps.roughness,
        metalness: materialProps.metalness,
      };
      if (nightMap) {
        options.emissiveMap = nightMap;
        options.emissive = "#ffaa88";
        options.emissiveIntensity = quality === "high" ? 1.2 : 0.8;
      }
      material = new THREE.MeshStandardMaterial(options);
    } else {
      material = new THREE.MeshStandardMaterial({
        color: data.color,
        roughness: materialProps.roughness,
        metalness: materialProps.metalness,
      });
    }

    materialsRef.current.push(material);
    return material;
  }, [data, quality, colorMap, nightMap, sunTexture, materialProps]);

  const ringMaterial = useMemo(() => {
    let material: THREE.Material;
    if (ringMap) {
      material = new THREE.MeshStandardMaterial({
        map: ringMap,
        transparent: true,
        opacity: quality === "high" ? 0.9 : 0.8,
        side: THREE.DoubleSide,
      });
    } else {
      material = new THREE.MeshStandardMaterial({
        color: "#e5c185",
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
    }
    materialsRef.current.push(material);
    return material;
  }, [ringMap, quality]);

  const atmosphereMaterial = useMemo(() => {
    if (!atmosphereMap) return null;
    const material = new THREE.MeshStandardMaterial({
      map: atmosphereMap,
      transparent: true,
      opacity: quality === "high" ? 0.4 : 0.3,
      depthWrite: false,
    });
    materialsRef.current.push(material);
    return material;
  }, [atmosphereMap, quality]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);

    if (!isPaused && data.id !== "sun") {
      angleRef.current += data.speed * 0.12 * dt;
    }
    const angle = angleRef.current;

    let centerX = 0;
    let centerZ = 0;

    if (data.orbits && globalPositionsRef.current[data.orbits]) {
      const parentPos = globalPositionsRef.current[data.orbits];
      centerX = parentPos.x;
      centerZ = parentPos.z;
    }

    const x = centerX + Math.cos(angle) * data.distance;
    const z = centerZ + Math.sin(angle) * data.distance;

    if (groupRef.current) {
      groupRef.current.position.set(x, 0, z);
      globalPositionsRef.current[data.id] = groupRef.current.position.clone();
    }

    if (meshRef.current && !isPaused && data.id !== "sun") {
      meshRef.current.rotation.y += dt * 0.25;
    }
    if (atmoRef.current && !isPaused) {
      atmoRef.current.rotation.y += dt * 0.3;
    }
    if (glowRef.current) {
      const pulse = 1.2 + Math.sin(state.clock.getElapsedTime() * 3) * 0.05;
      glowRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  useEffect(() => {
    return () => {
      texturesRef.current.forEach((texture) => {
        if (texture && typeof texture.dispose === 'function') {
          texture.dispose();
        }
      });
      texturesRef.current = [];

      materialsRef.current.forEach((material) => {
        if (material) {
          if (Array.isArray(material)) {
            material.forEach((m) => {
              if (m && typeof (m as THREE.Material).dispose === 'function') {
                (m as THREE.Material).dispose();
              }
            });
          } else if (typeof (material as THREE.Material).dispose === 'function') {
            (material as THREE.Material).dispose();
          }
        }
      });
      materialsRef.current = [];

      geometriesRef.current.forEach((geometry) => {
        if (geometry && typeof geometry.dispose === 'function') {
          geometry.dispose();
        }
      });
      geometriesRef.current = [];

      if (globalPositionsRef.current[data.id]) {
        delete globalPositionsRef.current[data.id];
      }
    };
  }, [data.id, globalPositionsRef]);

  return (
    <group>
      {showOrbit && data.distance > 0 && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <ringGeometry args={[data.distance - 0.08, data.distance + 0.08, 128]} />
          <meshBasicMaterial
            color={data.id === "sun" ? "#ff8800" : "#22d3ee"}
            transparent
            opacity={quality === "high" ? 0.15 : 0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      <group ref={groupRef}>
        {isSelected && (
          <mesh ref={glowRef} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[data.size * 1.25, data.size * 1.35, 64]} />
            <meshBasicMaterial color="#06b6d4" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
        )}

        {/* ============================================================
        ✅ 太阳光晕 - 使用 THREE.Sprite（始终面向相机）
        ============================================================ */}
        {data.id === "sun" && (
          <>
            <primitive
              object={
                new THREE.Sprite(
                  new THREE.SpriteMaterial({
                    map: glowTexture,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    opacity: 0.25,
                  })
                )
              }
              scale={[data.size * 14, data.size * 14, 1]}
            />
            <primitive
              object={
                new THREE.Sprite(
                  new THREE.SpriteMaterial({
                    map: glowTexture,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    opacity: 0.45,
                    color: new THREE.Color("#ffaa44"),
                  })
                )
              }
              scale={[data.size * 8, data.size * 8, 1]}
            />
            <primitive
              object={
                new THREE.Sprite(
                  new THREE.SpriteMaterial({
                    map: glowTexture,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    opacity: 0.8,
                    color: new THREE.Color("#ff8833"),
                  })
                )
              }
              scale={[data.size * 4, data.size * 4, 1]}
            />
          </>
        )}

        <mesh
          ref={meshRef}
          onClick={(e) => { e.stopPropagation(); onSelect(data.id); }}
          castShadow={data.id !== "sun"}
          receiveShadow={data.id !== "sun"}
        >
          <sphereGeometry args={[data.size, segments, segments]} />
          <primitive object={planetMaterial} attach="material" />
        </mesh>

        {atmosphereMaterial && (
          <mesh ref={atmoRef}>
            <sphereGeometry args={[data.size * 1.03, segments, segments]} />
            <primitive object={atmosphereMaterial} attach="material" />
          </mesh>
        )}

        {data.hasRing && (
          <mesh rotation={[Math.PI / 2.3, 0, 0.1]}>
            <ringGeometry args={[data.size * 1.35, data.size * 2.6, quality === "high" ? 128 : 64]} />
            <primitive object={ringMaterial} attach="material" />
          </mesh>
        )}

        {data.id !== "sun" && quality === "high" && (
          <mesh>
            <sphereGeometry args={[data.size * 1.02, segments, segments]} />
            <meshBasicMaterial
              color={data.color}
              transparent
              opacity={0.06}
              blending={THREE.AdditiveBlending}
              side={THREE.BackSide}
            />
          </mesh>
        )}

        <Html
  position={[
    0,
    // ✅ 提高 Y 轴偏移，让标签远离星球
    data.size * (
      data.id === "saturn" ? 2.8 :
      data.id === "sun" ? 4.0 :
      data.id === "moon" ? 2.5 :  // 月球特别加高
      2.0  // 其他星球统一加高到 2 倍大小
    ) + 0.6,  // ✅ 额外固定偏移，确保不遮挡
    0
  ]}
  center
  distanceFactor={data.id === "moon" ? 12 : 18}
  style={{
    pointerEvents: "auto",
    transform: data.size < 0.6 ? 'scale(0.8)' : 'scale(1)'
  }}
>
  {/* 标签内容 */}
</Html>
      </group>
    </group>
  );
};