import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from "@react-three/drei";
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
    case 6: return new THREE.BoxGeometry(0.7, 0.7, 0.7);
    case 8: return new THREE.OctahedronGeometry(0.6);
    case 10: return new THREE.ConeGeometry(0.5, 1.0, 5);
    case 12: return new THREE.DodecahedronGeometry(0.55);
    case 20: return new THREE.IcosahedronGeometry(0.55);
    case 100: return new THREE.SphereGeometry(0.55, 32, 32);
    default: return new THREE.BoxGeometry(0.7, 0.7, 0.7);
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
      landed.current = false;
      bounceCount.current = 0;
      if (meshRef.current) {
        meshRef.current.position.set(position[0], position[1] + 5, position[2]);
        meshRef.current.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      }
    }
  }, [isRolling, position]);

  return (
    <mesh ref={meshRef} position={position} castShadow receiveShadow geometry={geometry as any}>
      <meshStandardMaterial 
        ref={materialRef}
        color={color} 
        metalness={0.8} 
        roughness={0.2}
        emissive={color}
        emissiveIntensity={0.3}
      />
    </mesh>
  );
};

const CameraController = ({ targets }: { targets: THREE.Vector3[] }) => {
  const { camera } = useThree();
  const currentTarget = useRef(new THREE.Vector3(0, 5, 10));
  
  useFrame(() => {
    if (targets.length === 0) return;
    
    const averagePosition = new THREE.Vector3(0, 0, 0);
    targets.forEach(pos => averagePosition.add(pos));
    averagePosition.divideScalar(targets.length);
    
    const targetPos = averagePosition.clone().add(new THREE.Vector3(0, 8, 12));
    currentTarget.current.lerp(targetPos, 0.05);
    
    camera.position.lerp(currentTarget.current, 0.05);
    camera.lookAt(averagePosition);
  });
  
  return null;
};

const DiceBoxInternal = forwardRef<DiceBoxRef, DiceBoxProps>(({ onRoll }, ref) => {
  const [diceConfig, setDiceConfig] = useState<{ faces: number; count: number; color: string }[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const dicePositions = useRef<[number, number, number][]>([]);
  
  const controls = useControls({
    Camera: folder({
      autoFollow: { value: true, label: 'Auto Follow Dice' },
      fov: { value: 60, min: 30, max: 100, label: 'Field of View' },
      zoomSpeed: { value: 1.5, min: 0.5, max: 3, label: 'Zoom Speed' },
    }),
    Dice: folder({
      glowIntensity: { value: 0.8, min: 0, max: 2, label: 'Glow Intensity' },
      bounceFactor: { value: 0.4, min: 0.1, max: 0.8, label: 'Bounce' },
      rotationDamping: { value: 0.98, min: 0.9, max: 0.99, label: 'Rotation Damping' },
    }),
    Environment: folder({
      preset: { value: 'city', options: ['city', 'night', 'warehouse', 'studio'], label: 'Environment' },
      shadows: { value: true, label: 'Shadows' },
      gridHelper: { value: false, label: 'Show Grid' },
    }),
  });

  const roll = useCallback((notation: string) => {
    const parsed = notation.match(/(\d+)?d(\d+)/i);
    if (!parsed) return;
    
    const count = parseInt(parsed[1] || '1');
    const faces = parseInt(parsed[2]);
    
    const newDice = Array(count).fill(null).map((_, i) => ({
      faces,
      count: 1,
      color: i % 2 === 0 ? '#00ffff' : '#ff00ff',
    }));
    
    dicePositions.current = Array(count).fill(null).map((_, i) => [
      (i % 3 - 1) * 1.5,
      5,
      Math.floor(i / 3) * 1.5
    ] as [number, number, number]);
    
    setDiceConfig(newDice);
    setIsRolling(true);
  }, []);

  useImperativeHandle(ref, () => ({
    roll,
  }));

  const handleLand = useCallback((value: number, index: number) => {
    setDiceConfig(prev => {
      const newDice = [...prev];
      
      if (index === newDice.length - 1) {
        setTimeout(() => setIsRolling(false), 500);
        if (onRoll) {
          onRoll({
            results: Array(newDice.length).fill(value),
            total: value * newDice.length,
            notation: `${newDice.length}d${newDice[0]?.faces || 6}`,
          });
        }
      }
      return newDice;
    });
  }, [onRoll]);

  const getDiePositions = useCallback(() => {
    return dicePositions.current.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  }, []);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 8, 12]} fov={controls.fov} />
      {controls.autoFollow && <CameraController targets={getDiePositions()} />}
      <OrbitControls 
        enableZoom={true} 
        enablePan={false}
        minDistance={5}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.2}
      />
      
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#00ffff" />
      <pointLight position={[-10, 10, -10]} intensity={1} color="#ff00ff" />
      <spotLight position={[0, 15, 0]} angle={0.5} penumbra={1} intensity={2} castShadow />
      
      <Environment preset={controls.preset as any} />
      
      <ContactShadows 
        resolution={1024} 
        scale={50} 
        blur={2} 
        opacity={0.5} 
        far={10} 
        color="#000000" 
      />
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial 
          color="#1a1a2e" 
          metalness={0.9} 
          roughness={0.1}
        />
      </mesh>
      
      {controls.gridHelper && (
        <gridHelper args={[50, 50, '#00ffff', '#1a1a2e']} />
      )}
      
      {diceConfig.map((die, index) => (
        <Die
          key={index}
          dieIndex={index}
          position={dicePositions.current[index] || [0, 5, 0]}
          faces={die.faces}
          color={die.color}
          isRolling={isRolling}
          glowIntensity={controls.glowIntensity}
          onLand={handleLand}
        />
      ))}
    </>
  );
});

export const DiceBox = forwardRef<DiceBoxRef, DiceBoxProps>((props, ref) => {
  return (
    <div className="dice-box-container">
      <Canvas
        shadows
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%' }}
      >
        <Suspense fallback={null}>
          <DiceBoxInternal {...props} ref={ref} />
        </Suspense>
      </Canvas>
    </div>
  );
});