// client/src/pages/tianyige/components/Planet.tsx
import React, { useRef, useMemo } from "react";
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

// 地球日夜混合 Shader（无云层版本，简化并修复编译问题）
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
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
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
      
      float dayMix = clamp((NdotL + 0.2) / 0.6, 0.0, 1.0);
      dayMix = pow(dayMix, 1.2);
      
      vec4 dayColor = texture2D(uDayTexture, vUv);
      vec4 nightColor = texture2D(uNightTexture, vUv);
      vec4 finalColor = mix(nightColor, dayColor, dayMix);
      
      // 大气边缘辉光
      float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
      vec3 glowColor = vec3(0.3, 0.5, 0.9) * fresnel * uGlowIntensity;
      finalColor.rgb += glowColor;
      
      gl_FragColor = finalColor;
    }
  `;

  return new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true });
};

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

  // 纹理加载
  const colorMap = data.textureUrl ? useLoader(THREE.TextureLoader, data.textureUrl) : null;
  const nightMap = data.nightTextureUrl ? useLoader(THREE.TextureLoader, data.nightTextureUrl) : null;
  const atmosphereMap = data.atmosphereUrl ? useLoader(THREE.TextureLoader, data.atmosphereUrl) : null;
  const ringMap = data.ringTextureUrl ? useLoader(THREE.TextureLoader, data.ringTextureUrl) : null;
  const sunTexture = (data.id === "sun" && data.textureUrl) ? useLoader(THREE.TextureLoader, data.textureUrl) : null;

  if (colorMap) colorMap.colorSpace = THREE.SRGBColorSpace;
  if (nightMap) nightMap.colorSpace = THREE.SRGBColorSpace;
  if (atmosphereMap) atmosphereMap.colorSpace = THREE.SRGBColorSpace;
  if (ringMap) ringMap.colorSpace = THREE.SRGBColorSpace;
  if (sunTexture) sunTexture.colorSpace = THREE.SRGBColorSpace;

  const segments = quality === "high" ? 96 : quality === "medium" ? 48 : 24;
  const materialProps = {
    roughness: quality === "high" ? 0.35 : quality === "medium" ? 0.5 : 0.7,
    metalness: quality === "high" ? 0.3 : quality === "medium" ? 0.2 : 0.1,
  };

  const sunColorMultiplier = 0xffdd99;
  const sunEmissiveIntensity = quality === "high" ? 0.5 : quality === "medium" ? 0.4 : 0.3;

  const planetMaterial = useMemo(() => {
    // 地球：日夜混合 Shader
    if (data.id === "earth" && colorMap && nightMap) {
      return createEarthMaterial(colorMap, nightMap, quality);
    }

    // 太阳：纹理 + 高亮颜色
    if (data.id === "sun" && sunTexture) {
      return new THREE.MeshStandardMaterial({
        map: sunTexture,
        color: sunColorMultiplier,
        emissive: "#ff8844",
        emissiveIntensity: sunEmissiveIntensity,
        roughness: 0.3,
        metalness: 0.1,
      });
    }

    // 其他带纹理的星球
    if (colorMap && data.id !== "sun") {
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
      return new THREE.MeshStandardMaterial(options);
    }

    // 回退纯色材质
    return new THREE.MeshStandardMaterial({
      color: data.color,
      roughness: materialProps.roughness,
      metalness: materialProps.metalness,
    });
  }, [data, quality, colorMap, nightMap, sunTexture, materialProps]);

  const ringMaterial = useMemo(() => {
    if (ringMap) {
      return new THREE.MeshStandardMaterial({
        map: ringMap,
        transparent: true,
        opacity: quality === "high" ? 0.9 : 0.8,
        side: THREE.DoubleSide,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: "#e5c185",
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
  }, [ringMap, quality]);

  const atmosphereMaterial = useMemo(() => {
    if (atmosphereMap) {
      return new THREE.MeshStandardMaterial({
        map: atmosphereMap,
        transparent: true,
        opacity: quality === "high" ? 0.4 : 0.3,
        depthWrite: false,
      });
    }
    return null;
  }, [atmosphereMap, quality]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    if (!isPaused && data.id !== "sun") {
      angleRef.current += data.speed * 0.12 * dt;
    }
    const angle = angleRef.current;
    const x = Math.cos(angle) * data.distance;
    const z = Math.sin(angle) * data.distance;

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
        {data.id === "sun" && (
          <pointLight
            intensity={quality === "high" ? 45 : quality === "medium" ? 28 : 15}
            distance={600}
            decay={1.0}
            color="#ffaa66"
            castShadow={quality !== "low"}
            shadow-mapSize-width={quality === "high" ? 2048 : 1024}
            shadow-mapSize-height={quality === "high" ? 2048 : 1024}
          />
        )}

        {isSelected && (
          <mesh ref={glowRef} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[data.size * 1.25, data.size * 1.35, 64]} />
            <meshBasicMaterial color="#06b6d4" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
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
          position={[0, data.size * (data.id === "saturn" ? 2.8 : 1.5), 0]}
          center
          distanceFactor={18}
          style={{ pointerEvents: "auto" }}
        >
          <div
            onClick={(e) => { e.stopPropagation(); onSelect(data.id); }}
            className={`planet-tag ${isSelected ? "selected" : ""}`}
          >
            <span
              className="planet-tag-bullet"
              style={{ backgroundColor: data.id === "sun" ? "#fbbf24" : "#06b6d4" }}
            />
            <span>{data.name}</span>
            <span className="planet-tag-en">{data.englishName}</span>
          </div>
        </Html>
      </group>
    </group>
  );
};