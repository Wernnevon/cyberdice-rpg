import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from "@react-three/drei";
import { useRef, useState, useEffect, forwardRef, useImperativeHandle, memo, Suspense } from "react";
import * as THREE from "three";
import { useControls } from "leva";
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
  onLand: (value: number) => void;
  color: string;
  isRolling: boolean;
}

const getDiceGeometry = (faces: number) => {
  switch (faces) {
    case 4: return new THREE.TetrahedronGeometry(0.5);
    case 6: return new THREE.BoxGeometry(0.6, 0.6, 0.6);
    case 8: return new THREE.OctahedronGeometry(0.5);
    case 10: return new THREE.ConeGeometry(0.4, 0.8, 5);
    case 12: return new THREE.DodecahedronGeometry(0.5);
    case 20: return new THREE.IcosahedronGeometry(0.5);
    case 100: return new THREE.SphereGeometry(0.5, 16, 16);
    default: return new THREE.BoxGeometry(0.6, 0.6, 0.6);
  }
};

const Die = ({ position, faces, onLand, color, isRolling }: DieProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const rotationVelocity = useRef(new THREE.Vector3());
  const landed = useRef(false);
  
  const geometry = getDiceGeometry(faces);
  
  useFrame((_, delta) => {
    if (!meshRef.current || !isRolling || landed.current) return;
    
    meshRef.current.rotation.x += rotationVelocity.current.x * delta;
    meshRef.current.rotation.y += rotationVelocity.current.y * delta;
    meshRef.current.rotation.z += rotationVelocity.current.z * delta;
    
    const newPosition = meshRef.current.position.clone();
    newPosition.y -= 9.8 * delta;
    
    if (newPosition.y < -2) {
      newPosition.y = -2;
      rotationVelocity.current.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );
      rotationVelocity.current.multiplyScalar(0.7);
      
      if (rotationVelocity.current.length() < 1) {
        landed.current = true;
        const finalValue = Math.floor(Math.random() * faces) + 1;
        onLand(finalValue);
      }
    }
    
    meshRef.current.position.copy(newPosition);
  });
  
  useEffect(() => {
    if (isRolling && !landed.current) {
      rotationVelocity.current.set(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15
      );
      if (meshRef.current) {
        meshRef.current.position.set(position[0], 3, position[2]);
      }
      landed.current = false;
    }
  }, [isRolling, position]);
  
  return (
    <mesh ref={meshRef} position={position} castShadow receiveShadow>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial 
        color={color} 
        metalness={0.6} 
        roughness={0.3}
        emissive={color}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
};

const DiceBox = forwardRef<DiceBoxRef, DiceBoxProps>(({ onRoll }, ref) => {
  const [dice, setDice] = useState<Array<{ id: number; faces: number; position: [number, number, number]; color: string }>>([]);
  const [isRolling, setIsRolling] = useState(false);
  const results = useRef<number[]>([]);
  
  const controls = useControls({
    cameraDistance: { value: 8, min: 3, max: 15, step: 0.5 },
    cameraHeight: { value: 5, min: 1, max: 10, step: 0.5 },
    diceColor: { value: "#00f3ff" },
    glowIntensity: { value: 0.3, min: 0, max: 1, step: 0.1 },
    shadowOpacity: { value: 0.5, min: 0, max: 1, step: 0.1 },
    environmentPreset: { 
      value: "city", 
      options: ["city", "sunset", "dawn", "night", "warehouse", "forest", "apartment", "studio"] 
    },
  });
  
  useImperativeHandle(ref, () => ({
    roll: (notation: string) => {
      const match = notation.match(/(\d*)d(\d+)/i);
      if (!match) return;
      
      const count = parseInt(match[1]) || 1;
      const faces = parseInt(match[2]);
      
      setIsRollin