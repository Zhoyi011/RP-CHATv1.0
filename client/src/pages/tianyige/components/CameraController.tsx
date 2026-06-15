// client/src/pages/tianyige/components/CameraController.tsx
import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface CameraControllerProps {
  selectedId: string | null;
  globalPositionsRef: React.MutableRefObject<Record<string, THREE.Vector3>>;
  resetTrigger: number;
}

export const CameraController: React.FC<CameraControllerProps> = ({
  selectedId,
  globalPositionsRef,
  resetTrigger,
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const lastResetRef = useRef<number>(0);
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const isAnimatingRef = useRef<boolean>(false);

  // 重置视野
  useEffect(() => {
    if (resetTrigger > lastResetRef.current && resetTrigger > 0) {
      targetCamPosRef.current = new THREE.Vector3(0, 35, 60);
      isAnimatingRef.current = true;
      lastResetRef.current = resetTrigger;
    }
  }, [resetTrigger]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);

    // 1. 重置视野动画
    if (isAnimatingRef.current && targetCamPosRef.current) {
      const homeTarget = new THREE.Vector3(0, 0, 0);

      if (controlsRef.current) {
        controlsRef.current.target.lerp(homeTarget, 0.08);
      }
      camera.position.lerp(targetCamPosRef.current, 0.08);

      if (
        camera.position.distanceTo(targetCamPosRef.current) < 0.5 &&
        (!controlsRef.current || controlsRef.current.target.distanceTo(homeTarget) < 0.5)
      ) {
        isAnimatingRef.current = false;
        targetCamPosRef.current = null;
      }
      return;
    }

    // 2. 跟踪选中的行星
    if (selectedId && globalPositionsRef.current[selectedId]) {
      const targetPos = globalPositionsRef.current[selectedId];

      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetPos, 0.08);
        controlsRef.current.update();
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      maxDistance={160}
      minDistance={5}
      makeDefault
      enableZoom={true}
      enablePan={true}
      zoomSpeed={1.2}
      rotateSpeed={0.8}
    />
  );
};