import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, RoundedBox } from "@react-three/drei";
import { useRef, useState, useEffect, forwardRef, useImperativeHandle, Suspense, useCallback } from "react";
import * as THREE from "three";
import { useControls, folder } from "leva";
import "./styles.css";

interface DiceBoxProps {
  onRoll?: (results: any) => void;
}

export interface DiceBoxRef {
  roll: (notation: string) => void;
}

interface DieProps {
  position: [number, number, number];
  faces: number;
  onLand: (value: number, dieIndex: number) => void;
  color: string;
  isRolling: boolean;
  dieIndex: number;
  glowIntensity: number;
}

const getDiceGeometry = (faces: number) => {
  switch (faces) {
    case 4: return new THREE.TetrahedronGeometry(0.6);
    case 6: return new RoundedBox(0.7, 0.7, 0.7, 4, 0.1);
    case 8: return new THREE.OctahedronGeometry(0.6);
    case 10: return new THREE.ConeGeometry(0.5, 1.0, 5);
    case 12: return new THREE.DodecahedronGeometry(0.55);
    case 20: return new THREE.IcosahedronGeometry(0.55);
    case 100: return new THREE.SphereGeometry(0.55, 32, 32);
    default: return new RoundedBox(0.7, 0.7, 0.7, 4, 0.1);
  }
};

const getFaceValueFromRotation = (mesh: THREE.Mesh, faces: number): number => {
  const quaternion = mesh.quaternion;
  const up = new THREE.Vector3(0, 1, 0);
  up.applyQuaternion(quaternion);
  
  if (faces === 6) {
    if (up.y > 0.9) return 1;
    if (up.y < -0.9) return 6;
    if (up.x > 0.9) return 3;
    if (up.x < -0.9) return 4;
    if (up.z > 0.9) return 5;
    if (up.z < -0.9) return 2;
  }
  
  return Math.floor(Math.random() * faces) + 1;
};

const Die = ({ position, faces, onLand, color, isRolling, dieIndex, glowIntensity }: DieProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const angularVelocity = useRef(new THREE.Vector3(0, 0, 0));
  const landed = useRef(false);
  const bounceCount = useRef(0);
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  
  const geometry = getDiceGeometry(faces);
  
  useFrame((state, delta) => {
    if (!meshRef.current || !isRolling || landed.current) return;
    
    const limitedDelta = Math.min(delta, 0.1);
    
    angularVelocity.current.multiplyScalar(1 - (2 * limitedDelta));
    meshRef.current.rotation.x += angularVelocity.current.x * limitedDelta;
    meshRef.current.rotation.y += angularVelocity.current.y * limitedDelta;
    meshRef.current.rotation.z += angularVelocity.current.z * limitedDelta;
    
    velocity.current.y -= 20 * limitedDelta;
    
    const newPosition = meshRef.current.position.clone();
    newPosition.addScaledVector(velocity.current, limitedDelta);
    
    const floorLevel = -3 + (dieIndex * 0.3);
    if (newPosition.y < floorLevel) {
      newPosition.y = floorLevel;
      velocity.current.y = -velocity.current.y * 0.4;
      velocity.current.x *= 0.6;
      velocity.current.z *= 0.6;
      
      angularVelocity.current.multiplyScalar(0.5);
      bounceCount.current += 1;
      
      if (Math.abs(velocity.current.y) < 0.5 && bounceCount.current > 3) {
        velocity.current.set(0, 0, 0);
        angularVelocity.current.set(0, 0, 0);
        landed.current = true;
        
        const finalValue = getFaceValueFromRotation(meshRef.current, faces);
        onLand(finalValue, dieIndex);
      }
    }
    
    meshRef.current.position.copy(newPosition);
    
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = isRolling ? glowIntensity * (0.5 + Math.sin(state.clock.elapsedTime * 10) * 0.5) : glowIntensity * 0.3;
    }
  });
  
  useEffect(() => {
    if (isRolling && !landed.current) {
      velocity.current.set(
        (Math.random() - 0.5) * 8,
        5 + Math.random() * 3,
        (Math.random() - 0.5) * 8
      );
      angularVelocity.current.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      );
      if (meshRef.current) {