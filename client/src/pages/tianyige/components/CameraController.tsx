// client/src/pages/tianyige/components/CameraController.tsx

import React, { useRef, useEffect, useState } from "react";
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

  // ========== 状态 ==========
  const [keys, setKeys] = useState<Record<string, boolean>>({});
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  
  // 重置动画相关
  const isAnimatingReset = useRef(false);
  const resetStartPos = useRef(new THREE.Vector3());
  const resetStartTarget = useRef(new THREE.Vector3());
  const resetProgress = useRef(0);
  const resetTargetPos = new THREE.Vector3(0, 28, 55);
  const resetTargetLookAt = new THREE.Vector3(0, 0, 0);

  // 行星跟踪相关
  const prevPlanetPos = useRef(new THREE.Vector3());
  const isLocked = useRef(false);

  // ========== 键盘事件 ==========
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const arrowKeys = ["arrowup", "arrowdown", "arrowleft", "arrowright"];
      if (["w", "a", "s", "d", ...arrowKeys].includes(key) ||
          [...arrowKeys].includes(e.key)) {
        e.preventDefault();
        setKeys(prev => ({ ...prev, [key]: true }));
      }
      if (key === "r") {
        triggerReset();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const arrowKeys = ["arrowup", "arrowdown", "arrowleft", "arrowright"];
      if (["w", "a", "s", "d", ...arrowKeys].includes(key) ||
          [...arrowKeys].includes(e.key)) {
        e.preventDefault();
        setKeys(prev => ({ ...prev, [key]: false }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const triggerReset = () => {
    if (controlsRef.current) {
      resetStartPos.current.copy(camera.position);
      resetStartTarget.current.copy(controlsRef.current.target);
    } else {
      resetStartPos.current.copy(camera.position);
      resetStartTarget.current.set(0, 0, 0);
    }
    resetProgress.current = 0;
    isAnimatingReset.current = true;
  };

  // ========== 外部重置触发 ==========
  useEffect(() => {
    if (resetTrigger > 0) {
      triggerReset();
    }
  }, [resetTrigger]);

  // ========== 锁定状态变化 ==========
  useEffect(() => {
    if (selectedId && globalPositionsRef.current[selectedId]) {
      // 锁定开始时，记录行星位置
      const pos = globalPositionsRef.current[selectedId];
      prevPlanetPos.current.copy(pos);
      isLocked.current = true;
    } else {
      isLocked.current = false;
    }
  }, [selectedId, globalPositionsRef]);

  // ========== 主循环 ==========
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const currentPlanetPos = selectedId ? globalPositionsRef.current[selectedId] : null;

    // ============================================================
    // 1. 重置动画
    // ============================================================
    if (isAnimatingReset.current) {
      resetProgress.current += dt * 0.5;
      const t = Math.min(resetProgress.current, 1);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      camera.position.lerpVectors(resetStartPos.current, resetTargetPos, ease);
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(resetStartTarget.current, resetTargetLookAt, ease);
      }

      if (t >= 1) {
        isAnimatingReset.current = false;
        if (controlsRef.current) {
          controlsRef.current.target.set(0, 0, 0);
        }
        velocity.current.set(0, 0, 0);
      }
      if (controlsRef.current) controlsRef.current.update();
      return;
    }

    // ============================================================
    // 2. 锁定模式：跟随行星公转 + 允许自由视角
    // ============================================================
    if (isLocked.current && currentPlanetPos) {
      const planetPos = currentPlanetPos;
      const deltaPos = new THREE.Vector3().subVectors(planetPos, prevPlanetPos.current);

      // 如果行星移动了（公转），平移相机和 target
      if (deltaPos.length() > 0.001) {
        camera.position.add(deltaPos);
        if (controlsRef.current) {
          controlsRef.current.target.add(deltaPos);
        }
        prevPlanetPos.current.copy(planetPos);
      }

      // 确保 target 精确对齐到行星位置（平滑）
      if (controlsRef.current) {
        controlsRef.current.target.lerp(planetPos, 0.1);
        controlsRef.current.update();
      }

      // 锁定模式下键盘移动无效，但缩放/旋转由 OrbitControls 处理
      return;
    }

    // ============================================================
    // 3. 非锁定模式：键盘平滑移动
    // ============================================================
    // 如果没有锁定，但当前位置与行星无关，我们允许自由移动
    const speed = 12;
    const damping = 0.88;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    let moveX = 0;
    let moveZ = 0;
    if (keys["w"] || keys["arrowup"]) moveZ -= 1;
    if (keys["s"] || keys["arrowdown"]) moveZ += 1;
    if (keys["a"] || keys["arrowleft"]) moveX -= 1;
    if (keys["d"] || keys["arrowright"]) moveX += 1;

    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (len > 0) {
      moveX /= len;
      moveZ /= len;
    }

    const targetVel = new THREE.Vector3()
      .addScaledVector(right, moveX * speed)
      .addScaledVector(forward, moveZ * speed);

    velocity.current.lerp(targetVel, 0.15);
    velocity.current.multiplyScalar(damping);
    if (velocity.current.length() < 0.01) velocity.current.set(0, 0, 0);

    camera.position.add(velocity.current.clone().multiplyScalar(dt));

    if (moveX !== 0 || moveZ !== 0) {
      if (controlsRef.current) {
        controlsRef.current.target.add(velocity.current.clone().multiplyScalar(dt));
      }
    }

    if (controlsRef.current) controlsRef.current.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      maxDistance={120}
      minDistance={1.5}
      maxPolarAngle={Math.PI / 1.8}
      minPolarAngle={Math.PI / 6}
      makeDefault
      enableZoom={true}
      enablePan={!selectedId}
      zoomSpeed={1.2}
      rotateSpeed={0.8}
      target={new THREE.Vector3(0, 0, 0)}
    />
  );
};