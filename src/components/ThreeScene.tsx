import React, { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  Float, 
  PerspectiveCamera, 
  ContactShadows, 
  OrbitControls, 
  Text,
  Environment,
  shaderMaterial,
  Points,
  PointMaterial,
  useCursor,
  Html,
  Grid
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { gsap } from 'gsap';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Zap, 
  Heart, 
  User, 
  Target, 
  Briefcase,
  Lightbulb,
  Users,
  Shield,
  Coins,
  Cpu,
  Activity,
  Waypoints,
  Brain,
  Search,
  LucideIcon
} from 'lucide-react';

// --- SHADERS ---

const CoreShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorStart: new THREE.Color('#007AFF'), // Electric Blue
    uColorEnd: new THREE.Color('#A259FF'),   // Soft Violet
    uTransmission: 0.9,
  },
  // Vertex Shader
  `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  uniform float uTime;

  // Simple noise function for breathing
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i); 
    vec4 p = permute( permute( permute( 
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    // Breathing displacement
    float noise = snoise(vec3(position * 0.5 + uTime * 0.2));
    vec3 displacedPosition = position + normal * noise * 0.15;
    
    vec4 mvPosition = modelViewMatrix * vec4(displacedPosition, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
  `,
  // Fragment Shader
  `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  uniform float uTime;
  uniform vec3 uColorStart;
  uniform vec3 uColorEnd;
  uniform float uTransmission;

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
    
    vec3 color = mix(uColorStart, uColorEnd, vUv.y + sin(uTime * 0.1) * 0.5);
    
    // Glowing edge effect
    float alpha = mix(1.0 - uTransmission, 1.0, fresnel);
    vec3 finalDisplay = mix(color * 0.3, color, fresnel * 1.2);
    
    gl_FragColor = vec4(finalDisplay, alpha * 0.6);
  }
  `
);

extend({ CoreShaderMaterial });

// --- COMPONENTS ---

const IntelligenceModule = ({ 
    position, 
    label, 
    color, 
    icon: Icon, 
    onHover, 
    onClick,
    isSecondary = false,
    scale: customScale
  }: { 
    position: any, 
    label: string, 
    color: string, 
    icon: LucideIcon, 
    onHover: any,
    onClick: (label: string) => void,
    isSecondary?: boolean,
    scale?: number
  }) => {
    const meshRef = useRef<THREE.Mesh>(null!);
    const shellRef = useRef<THREE.Mesh>(null!);
    const [hovered, setHovered] = useState(false);
    useCursor(hovered);
  
    const scale = customScale || (isSecondary ? 0.5 : 0.85);
    const intensityBase = isSecondary ? 0.4 : 1.0;
  
    useFrame((state) => {
      const t = state.clock.getElapsedTime();
      if (meshRef.current) {
        meshRef.current.rotation.y += 0.01;
        
        // Continuous subtle breathing animation
        const breathing = Math.sin(t * (isSecondary ? 3 : 2)) * (isSecondary ? 0.08 : 0.05);
        meshRef.current.scale.setScalar((hovered ? 1.3 : 1) + breathing);

        if (hovered) {
          // Intense pulse when hovered
          // @ts-ignore
          meshRef.current.material.emissiveIntensity = 4.5 + Math.sin(t * 8) * 2.5;
        } else {
          // Subtle idle pulse
          // @ts-ignore
          meshRef.current.material.emissiveIntensity = intensityBase + Math.sin(t * 3) * (isSecondary ? 0.4 : 0.2);
        }
      }

      if (shellRef.current) {
        shellRef.current.rotation.y -= 0.005;
        shellRef.current.rotation.z += 0.003;
      }
    });
  
    useEffect(() => {
      if (!hovered) {
        // @ts-ignore
        gsap.to(meshRef.current.material, { emissiveIntensity: intensityBase, duration: 0.4 });
      }
    }, [hovered, intensityBase]);
  
    return (
      <Float speed={isSecondary ? 1 : 2} rotationIntensity={0.5} floatIntensity={1}>
        <group position={position}>
          <mesh 
            ref={meshRef}
            onClick={(e) => {
                e.stopPropagation();
                onClick(label);
            }}
            onPointerOver={() => { setHovered(true); onHover(label, color); }}
            onPointerOut={() => { setHovered(false); onHover(null, null); }}
          >
            <icosahedronGeometry args={[scale, 3]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={intensityBase}
              roughness={0.3}
              metalness={0.2}
            />
          </mesh>

          {/* Constant Surface Animation (Rotating Wireframe Shell) */}
          <group rotation={[Math.PI / 4, 0, Math.PI / 4]}>
            <mesh ref={shellRef}>
              <icosahedronGeometry args={[scale * 1.15, 2]} />
              <meshBasicMaterial 
                  color={color} 
                  wireframe 
                  transparent 
                  opacity={isSecondary ? 0.03 : 0.08}
                  blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>
          {/* Icon Overlay */}
          <Html 
            center 
            distanceFactor={isSecondary ? 8 : 10} 
            className="pointer-events-none"
            zIndexRange={[100, 0]}
          >
            <motion.div
              animate={{ 
                scale: hovered ? 1.6 : (isSecondary ? 1.1 : 1.3), 
                opacity: hovered ? 1 : (isSecondary ? 0.7 : 0.9) 
              }}
              className={`flex items-center justify-center p-2 rounded-full backdrop-blur-md bg-white/20 border border-white/30 ${hovered ? 'bg-blue-500/20 shadow-[0_0_20px_rgba(0,122,255,0.4)]' : ''}`}
            >
              <Icon 
                size={isSecondary ? 14 : 18} 
                strokeWidth={2} 
                style={{ color: hovered ? '#fff' : (isSecondary ? '#aaa' : color) }}
                className="drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
              />
            </motion.div>
          </Html>

          {/* Label Overlay (Primary & Specialized) */}
          {(true) && (
            <Text
              position={[0, 1.2, 0]}
              fontSize={0.25}
              color="white"
              anchorX="center"
              anchorY="middle"
              letterSpacing={0.25}
              fillOpacity={hovered ? 1 : 0.8}
            >
              {hovered ? `${label.toUpperCase()}: ${Math.floor(70 + Math.random() * 20)}%` : label.toUpperCase()}
            </Text>
          )}
        </group>
      </Float>
    );
  };
  
  const NeuralPathways = ({ 
    start, 
    end, 
    color, 
    isSecondary = false 
  }: { 
    start: THREE.Vector3, 
    end: THREE.Vector3, 
    color: string, 
    isSecondary?: boolean 
  }) => {
    const meshRef = useRef<THREE.Mesh>(null!);
    
    const curve = useMemo(() => {
      const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
      // More subtle arch
      mid.y += (isSecondary ? 0.5 : 1.5) * (Math.random() - 0.5);
      mid.z += (isSecondary ? 0.5 : 1.5) * (Math.random() - 0.5);
      return new THREE.QuadraticBezierCurve3(start, mid, end);
    }, [start, end, isSecondary]);

    useFrame((state) => {
      const t = state.clock.getElapsedTime();
      if (meshRef.current) {
        // Subtle breathing animation for the pathway
        const pulse = Math.sin(t * 1.5 + Math.random()) * 0.02 + (isSecondary ? 0.04 : 0.12);
        (meshRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
      }
    });
  
    return (
      <group>
        <mesh ref={meshRef}>
          <tubeGeometry args={[curve, 64, isSecondary ? 0.005 : 0.008, 8, false]} />
          <meshBasicMaterial 
            color={color} 
            transparent 
            opacity={isSecondary ? 0.05 : 0.15} 
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        {!isSecondary && <Beads path={curve} color={color} />}
      </group>
    );
  };

const Beads = ({ path, color }: { path: THREE.Curve<THREE.Vector3>, color: string }) => {
  const beadCount = 3; // Increased bead count
  const trailLength = 12; 
  const beads = useMemo(() => {
    return Array.from({ length: beadCount }).map((_, i) => ({
      offset: i / beadCount,
      speed: 0.12 + Math.random() * 0.08,
      pulseOffset: Math.random() * Math.PI * 2,
      colorPhase: Math.random() * Math.PI * 2
    }));
  }, [beadCount]);

  const groupRef = useRef<THREE.Group>(null!);
  const baseColor = useMemo(() => new THREE.Color(color), [color]);
  const highlightColor = useMemo(() => new THREE.Color('#ffffff'), []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (!groupRef.current) return;

    groupRef.current.children.forEach((beadGroup, i) => {
      const b = beads[i];
      if (!b) return;

      const baseProgress = (t * b.speed + b.offset) % 1;
      const pulse = Math.sin(t * 5 + b.pulseOffset) * 0.2 + 1;
      const colorFactor = (Math.sin(t * 2 + b.colorPhase) * 0.5 + 0.5);
      
      beadGroup.children.forEach((segment, j) => {
        const segmentOffset = j * 0.006; 
        let progress = baseProgress - segmentOffset;
        if (progress < 0) progress += 1;
        
        const pos = path.getPointAt(progress % 1);
        segment.position.copy(pos);
        
        const scaleBase = Math.pow(0.85, j);
        const s = scaleBase * pulse * (j === 0 ? 1.1 : 0.9);
        segment.scale.setScalar(s);

        const mesh = segment as THREE.Mesh;
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshBasicMaterial;
          const opacityBase = j === 0 ? 1 : Math.pow(0.7, j) * 0.8;
          mat.opacity = opacityBase * (j === 0 ? 1 : 0.6);
          
          // Color shift
          mat.color.copy(baseColor).lerp(highlightColor, colorFactor * (j === 0 ? 0.8 : 0.3));
        }
      });
    });
  });

  return (
    <group ref={groupRef}>
      {beads.map((_, i) => (
        <group key={i}>
          {Array.from({ length: trailLength }).map((_, j) => (
            <mesh key={j}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshBasicMaterial 
                color={color} 
                transparent 
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

const ParticleCloud = () => {
  const count = 1500;
  const pointsRef = useRef<THREE.Points>(null!);
  const mouse = useThree((state) => state.mouse);

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const initialPositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 20;
      positions.set([x, y, z], i * 3);
      initialPositions.set([x, y, z], i * 3);
    }
    return { positions, initialPositions };
  }, []);

  useFrame((state) => {
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const { initialPositions } = particles;
    
    // Raycaster-like gravity
    const target = new THREE.Vector3();
    const vector = new THREE.Vector3(mouse.x, mouse.y, 0.5).unproject(state.camera);
    const dir = vector.sub(state.camera.position).normalize();
    const distance = -state.camera.position.z / dir.z;
    target.copy(state.camera.position).add(dir.multiplyScalar(distance));

    const currentPos = new THREE.Vector3();
    const initialPos = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        currentPos.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
        initialPos.set(initialPositions[i3], initialPositions[i3 + 1], initialPositions[i3 + 2]);
        
        const distToMouse = currentPos.distanceTo(target);
        
        if (distToMouse < 3.0) {
            currentPos.lerp(target, 0.05);
        } else {
            currentPos.lerp(initialPos, 0.02);
        }
        
        positions[i3] = currentPos.x;
        positions[i3 + 1] = currentPos.y;
        positions[i3 + 2] = currentPos.z;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <Points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute 
          attach="attributes-position" 
          count={particles.positions.length / 3} 
          array={particles.positions} 
          itemSize={3} 
        />
      </bufferGeometry>
      <PointMaterial transparent color="#007AFF" size={0.05} sizeAttenuation={true} depthWrite={false} blending={THREE.AdditiveBlending} />
    </Points>
  );
};

const CoreAnalysisStream = () => {
    const [streams, setStreams] = useState<string[]>([]);
    
    useEffect(() => {
        const chars = "0123456789ABCDEF";
        const interval = setInterval(() => {
            setStreams(prev => {
                const newStream = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
                return [newStream, ...prev].slice(0, 8);
            });
        }, 50);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-50 overflow-hidden">
            <div className="flex flex-col gap-px">
                {streams.map((s, i) => (
                    <motion.div 
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1 - i * 0.12, x: 0 }}
                        key={`${s}-${i}`} 
                        className="text-[4px] font-mono text-blue-400 bg-blue-500/5 px-1 rounded-sm"
                    >
                        {s}
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

const InternalBrainActivity = () => {
    const pointsRef = useRef<THREE.Points>(null!);
    const count = 400;
    
    const particles = useMemo(() => {
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const r = Math.random() * 1.25;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);
      }
      return pos;
    }, []);
  
    useFrame((state) => {
      const t = state.clock.getElapsedTime();
      if (pointsRef.current) {
          pointsRef.current.rotation.y = t * 4; // Very fast rotation
          pointsRef.current.rotation.x = t * 2.5;
          pointsRef.current.scale.setScalar(0.9 + Math.sin(t * 10) * 0.1); // High frequency pulse
      }
    });
  
    return (
      <Points ref={pointsRef} positions={particles}>
        <PointMaterial 
          transparent 
          color="#A259FF" 
          size={0.04} 
          sizeAttenuation={true} 
          depthWrite={false} 
          blending={THREE.AdditiveBlending}
          opacity={0.6}
        />
      </Points>
    );
};

const HumanPotentialCore = ({ onClick, onHover }: { onClick: () => void, onHover: (label: string | null, color: string | null) => void }) => {
    const materialRef = useRef<any>(null!);
    const shellRef = useRef<THREE.Mesh>(null!);
    const [hovered, setHovered] = useState(false);
    useCursor(hovered);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (materialRef.current) {
            materialRef.current.uTime = t;
        }
        if (shellRef.current) {
            shellRef.current.rotation.y = t * 0.2;
            shellRef.current.rotation.z = t * 0.1;
            shellRef.current.scale.setScalar(1 + Math.sin(t * 1.5) * 0.05);
        }
    });

    return (
        <group>
            <mesh 
                onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                }}
                onPointerOver={() => { setHovered(true); onHover('NAVIGATOR_CORE', '#007AFF'); }}
                onPointerOut={() => { setHovered(false); onHover(null, null); }}
            >
                <sphereGeometry args={[1.5, 64, 64]} />
                {/* @ts-ignore */}
                <coreShaderMaterial ref={materialRef} transparent />
            </mesh>

            <InternalBrainActivity />

            {/* Core Wireframe Shell */}
            <mesh ref={shellRef}>
                <sphereGeometry args={[1.7, 32, 32]} />
                <meshBasicMaterial 
                    color="#007AFF" 
                    wireframe 
                    transparent 
                    opacity={0.15} 
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            {/* Central Core Icon */}
            <Html 
                center 
                distanceFactor={6} 
                className="pointer-events-none"
                zIndexRange={[100, 0]}
            >
                <motion.div
                    animate={{ 
                        scale: hovered ? 1.2 : 1.0,
                        opacity: [0.9, 1, 0.9],
                        filter: ['brightness(1)', 'brightness(1.4)', 'brightness(1)']
                    }}
                    transition={{
                        opacity: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                        filter: { repeat: Infinity, duration: 2, ease: "easeInOut" }
                    }}
                    className="flex flex-col items-center justify-center"
                >
                    <div className="relative flex items-center justify-center">
                        {/* Smaller Stylized N Core Icon using SVG for dots and lines */}
                        <div className="relative w-16 h-16">
                            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(0,122,255,0.6)]">
                                {/* Connectivity background */}
                                <motion.path
                                    d="M35 75 L35 25 L65 75 L65 25"
                                    fill="none"
                                    stroke="rgba(0, 122, 255, 0.2)"
                                    strokeWidth="1"
                                    strokeDasharray="2 4"
                                />
                                {/* Main animated path */}
                                <motion.path
                                    d="M35 75 L35 25 L65 75 L65 25"
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    initial={{ pathLength: 0, opacity: 0.2 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                                />
                                {/* Joint dots */}
                                {[
                                    { x: 35, y: 75 }, { x: 35, y: 25 },
                                    { x: 65, y: 75 }, { x: 65, y: 25 }
                                ].map((p, i) => (
                                    <motion.circle
                                        key={i}
                                        cx={p.x} cy={p.y} r="3"
                                        fill="#007AFF"
                                        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                                        transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
                                    />
                                ))}
                            </svg>
                        </div>
                        {/* Static/Electricity Effect Overlay (subtler) */}
                        <motion.div 
                            animate={{ 
                                opacity: [0.05, 0.2, 0.05],
                                scale: [1, 1.1, 1]
                            }}
                            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                            className="absolute inset-0 border border-blue-400/10 rounded-full blur-xl"
                        />
                        <div className="absolute inset-x-0 -bottom-2 text-[6px] text-blue-400/60 font-mono tracking-[0.5em] uppercase text-center animate-pulse font-bold">
                            SYNCING
                        </div>
                        <CoreAnalysisStream />
                    </div>
                </motion.div>
            </Html>
        </group>
    );
};

const Scene = ({ 
    setHoveredModule, 
    onNodeClick 
}: { 
    setHoveredModule: (label: string | null, color: string | null) => void,
    onNodeClick: (label: string) => void 
}) => {
  const primaryNodes = useMemo(() => [
    { 
      label: 'Physical', 
      pos: [6, 2, 0], 
      color: '#3B82F6', 
      icon: Activity,
      traits: ['Attendance', 'Energy', 'Wellness'] 
    },
    { 
      label: 'Engagement', 
      pos: [-5, 4, 3], 
      color: '#F59E0B', 
      icon: Zap,
      traits: ['Participation', 'Task', 'Collaboration'] 
    },
    { 
      label: 'Emotional', 
      pos: [-4, -5, -2], 
      color: '#EC4899', 
      icon: Heart,
      traits: ['Confidence', 'Stability', 'Persistence'] 
    },
    { 
      label: 'Cognitive', 
      pos: [5, -4, 4], 
      color: '#10B981', 
      icon: Brain,
      traits: ['Solving', 'Creativity', 'Logic'] 
    },
    { 
      label: 'Purpose', 
      pos: [2, 6, -4], 
      color: '#8B5CF6', 
      icon: Target,
      traits: ['Interests', 'Curiosity', 'Goals'] 
    },
  ], []);

  const secondaryNodes = useMemo(() => [
    { label: 'Leadership', pos: [8, -2, -6], color: '#ffffff', icon: Users },
    { label: 'Curiosity', pos: [-6, 6, -3], color: '#ffffff', icon: Search },
    { label: 'Collaboration', pos: [-7, -3, 6], color: '#ffffff', icon: Users },
    { label: 'Focus', pos: [3, -7, -2], color: '#ffffff', icon: Target },
    { label: 'Resilience', pos: [6, 6, 4], color: '#ffffff', icon: Shield },
    { label: 'Innovation', pos: [-4, -6, 5], color: '#ffffff', icon: Cpu },
    { label: 'Communication', pos: [-1, -8, -4], color: '#ffffff', icon: Briefcase },
    { label: 'Growth', pos: [4, 3, 6], color: '#ffffff', icon: Activity },
    { label: 'Creativity', pos: [0, -3, 8], color: '#ffffff', icon: Zap },
  ], []);

  const specializedNodes = useMemo(() => [
    { label: 'Institutional', pos: [8, 4, -4], color: '#3B82F6', icon: Shield },
    { label: 'Teacher', pos: [-7, -5, -4], color: '#F59E0B', icon: Users },
    { label: 'Parent', pos: [0, 6, -8], color: '#EC4899', icon: Heart },
  ], []);

  const corePos = new THREE.Vector3(0, 0, 0);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 18]} fov={50} />
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.0} color="#3B82F6" />
      <spotLight position={[-10, 20, 10]} angle={0.15} penumbra={1} intensity={1.5} color="#ffffff" />
      <fogExp2 attach="fog" args={['#050614', 0.005]} />
      <color attach="background" args={['#050614']} />

      <Suspense fallback={<mesh><boxGeometry /><meshBasicMaterial color="red" wireframe /></mesh>}>
        <group>
          <HumanPotentialCore onClick={() => onNodeClick('NAVIGATOR_CORE')} onHover={setHoveredModule} />
          {/* Subtle internal core pulse */}
          <mesh scale={1.1}>
            <sphereGeometry args={[1.5, 32, 32]} />
            <meshBasicMaterial color="#007AFF" transparent opacity={0.1} wireframe />
          </mesh>
        </group>

        {/* Primary Connections & Nodes */}
        {primaryNodes.map((m) => (
          <group key={`primary-${m.label}`}>
            <IntelligenceModule 
              position={m.pos as any} 
              label={m.label} 
              color={m.color}
              icon={m.icon}
              onHover={setHoveredModule} 
              onClick={onNodeClick}
            />
            <NeuralPathways 
              start={corePos} 
              end={new THREE.Vector3(...(m.pos as [number, number, number]))} 
              color={m.color}
            />
          </group>
        ))}

        {/* Secondary Nodes (fainter connections) */}
        {secondaryNodes.map((m) => (
          <group key={`secondary-${m.label}`}>
            <IntelligenceModule 
              position={m.pos as any} 
              label={m.label} 
              color={m.color}
              icon={m.icon}
              onHover={setHoveredModule} 
              onClick={onNodeClick}
              isSecondary
            />
            <NeuralPathways 
              start={corePos} 
              end={new THREE.Vector3(...(m.pos as [number, number, number]))} 
              color="#ffffff"
              isSecondary
            />
          </group>
        ))}

        {/* Specialized Nodes */}
        {specializedNodes.map((m) => (
          <group key={`special-${m.label}`}>
            <IntelligenceModule 
              position={m.pos as any} 
              label={m.label} 
              color={m.color}
              icon={m.icon}
              onHover={setHoveredModule} 
              onClick={onNodeClick}
              scale={1.1}
            />
            <NeuralPathways 
              start={corePos} 
              end={new THREE.Vector3(...(m.pos as [number, number, number]))} 
              color={m.color}
            />
          </group>
        ))}
        <Environment preset="night" />
      </Suspense>


      <ParticleCloud />
      
      <ContactShadows 
         rotation={[Math.PI / 2, 0, 0]} 
         position={[0, -10, 0]} 
         opacity={0.3} 
         width={40} 
         height={40} 
         blur={3} 
         far={15} 
         color="#000000"
      />

      <Grid 
        infiniteGrid 
        fadeDistance={50} 
        fadeStrength={5} 
        cellSize={1} 
        sectionSize={5} 
        sectionColor="#3B82F6" 
        cellColor="#1E293B" 
        position={[0, -10, 0]} 
      />

      <Grid 
        infiniteGrid 
        fadeDistance={50} 
        fadeStrength={5} 
        cellSize={1} 
        sectionSize={5} 
        rotation={[Math.PI / 2, 0, 0]}
        sectionColor="#3B82F6" 
        cellColor="#1E293B" 
        position={[0, 0, -20]} 
      />

      <EffectComposer>
        <Bloom luminanceThreshold={0.2} intensity={0.5} radius={0.5} />
        <Vignette eskil={false} offset={0.1} darkness={0.8} />
      </EffectComposer>

      <OrbitControls 
        enablePan={false} 
        enableZoom={true} 
        minDistance={5} 
        maxDistance={45} 
        autoRotate 
        autoRotateSpeed={0.15} 
        makeDefault 
      />
    </>
  );
};

// --- UI OVERLAY ---

const NODE_CONTENT: Record<string, { 
    title: string, 
    description: string, 
    stats: { label: string, value: string, trend?: string }[], 
    footer?: string,
    intervention?: { before: number, after: number, label: string }[]
}> = {
    'NAVIGATOR_CORE': {
        title: 'NAVIGATOR CORE',
        description: 'The central orchestrator for multi-dimensional student growth data. Synthesizing input vectors from 13 distinct development modules to build a real-time longitudinal map of human potential.',
        stats: [
            { label: 'DEVELOPMENT INDEX', value: '76' },
            { label: 'ACTIVE STUDENTS', value: '248' },
            { label: 'CONFIDENCE GROWTH', value: '+14%' },
            { label: 'ALIGNMENT', value: 'STRONG' }
        ],
        footer: '"Continuous assessment without intrusion; understanding without judgment."'
    },
    'Physical': {
        title: 'PHYSICAL VITALITY',
        description: 'Monitoring biological readiness and energy systems crucial for cognitive architecture.',
        stats: [
            { label: 'ATTENDANCE', value: '91%' },
            { label: 'ACTIVITY', value: '78%' },
            { label: 'ENERGY', value: '70%' },
            { label: 'STATUS', value: 'STABLE' }
        ]
    },
    'Engagement': {
        title: 'ENGAGEMENT MATRIX',
        description: 'Measuring participation frequency and active cognitive absorption.',
        stats: [
            { label: 'PARTICIPATION', value: '76%' },
            { label: 'ATTENTION', value: '68%' },
            { label: 'TASK ENGAGEMENT', value: '74%' },
            { label: 'COLLABORATION', value: '81%' }
        ]
    },
    'Emotional': {
        title: 'EMOTIONAL RESONANCE',
        description: 'Analyzing psychometric shifts and self-expression patterns.',
        stats: [
            { label: 'CONFIDENCE', value: '78%' },
            { label: 'STABILITY', value: '73%' },
            { label: 'SOCIAL', value: '81%' },
            { label: 'PERSISTENCE', value: '79%' }
        ],
        intervention: [
            { label: 'Confidence', before: 61, after: 78 },
            { label: 'Participation', before: 58, after: 79 }
        ]
    },
    'Cognitive': {
        title: 'COGNITIVE SYNTHESIS',
        description: 'Tracking the application of multi-model logic and creative problem solving.',
        stats: [
            { label: 'PROBLEM SOLVING', value: '84%' },
            { label: 'UNDERSTANDING', value: '82%' },
            { label: 'CREATIVITY', value: '78%' },
            { label: 'REASONING', value: '83%' }
        ]
    },
    'Purpose': {
        title: 'PURPOSE VECTOR',
        description: 'Aligning daily activity with long-term aspirations and curiosity patterns.',
        stats: [
            { label: 'INTEREST CLARITY', value: '71%' },
            { label: 'MOTIVATION', value: '73%' },
            { label: 'CURIOSITY', value: '82%' },
            { label: 'EXPLORATION', value: '65%' }
        ]
    },
    'Institutional': {
        title: 'GLOBAL NETWORK',
        description: 'Aggregated intelligence metrics across the school district network.',
        stats: [
            { label: 'TOTAL STUDENTS', value: '1842' },
            { label: 'SCHOOLS', value: '48' },
            { label: 'AVG INDEX', value: '72' },
            { label: 'REGIONAL IMP.', value: '+9%' }
        ],
        footer: 'District-level network signals active from Pacific Node 01.'
    },
    'Teacher': {
        title: 'TEACHER ANALYTICS',
        description: 'Classroom-level heatmaps and engagement alerts for proactive support.',
        stats: [
            { label: 'SUPPORT REQ.', value: '3 STUDENTS' },
            { label: 'ALERT LEVEL', value: 'MODERATE' },
            { label: 'TREND', value: 'DIPS IN LECTURES' }
        ]
    },
    'Parent': {
        title: 'PARENT INSIGHT',
        description: 'Strength mapping and support suggestions for home-based growth.',
        stats: [
            { label: 'KEY STRENGTH', value: 'CREATIVITY' },
            { label: 'DYNAMICS', value: 'COLLABORATIVE' }
        ],
        footer: 'Suggestion: Increase innovation exposure through project work.'
    },
    'Leadership': { title: 'LEADERSHIP', description: 'Monitoring team orchestration and influence vectors.', stats: [{ label: 'IMPACT', value: 'HIGH' }] },
    'Curiosity': { title: 'CURIOSITY', description: 'Tracking the frequency of non-linear exploration.', stats: [{ label: 'QUALITY', value: 'ACCELERATING' }] },
    'Collaboration': { title: 'COLLABORATION', description: 'Measuring the efficiency of cooperative intelligence.', stats: [{ label: 'SYNERGY', value: 'PEAK' }] },
    'Focus': { title: 'FOCUS', description: 'Isolating deep-work capacity from distraction variables.', stats: [{ label: 'DEPTH', value: 'MAX' }] },
    'Innovation': { title: 'INNOVATION', description: 'Detecting the emergence of original structural breakthroughs.', stats: [{ label: 'OUTPUT', value: 'NOVEL' }] },
    'Communication': { title: 'COMMUNICATION', description: 'Encoding the clarity of information exchange.', stats: [{ label: 'PRECISION', value: '98%' }] },
    'Resilience': { title: 'RESILIENCE', description: 'Quantifying recovery after high-stress events.', stats: [{ label: 'BUFFER', value: 'HIGH' }] },
    'Creativity': { title: 'CREATIVITY', description: 'Strong growth observed during open-ended problem solving.', stats: [{ label: 'OUTPUT', value: 'NOVEL' }] },
};

import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';

const DataStream = () => {
    const [lines, setLines] = useState<string[]>([]);
    
    useEffect(() => {
        const generateLine = () => {
            const hex = Math.random().toString(16).substring(2, 10).toUpperCase();
            const binary = Math.floor(Math.random() * 255).toString(2).padStart(8, '0');
            const value = (Math.random() * 100).toFixed(2);
            return `0x${hex} | ${binary} | ${value}%`;
        };

        const interval = setInterval(() => {
            setLines(prev => [generateLine(), ...prev.slice(0, 12)]);
        }, 300);
        
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="font-mono text-[8px] text-blue-400/30 overflow-hidden h-32 select-none">
            <AnimatePresence mode="popLayout">
                {lines.map((line, i) => (
                    <motion.div
                        key={line + i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.5 }}
                        className="whitespace-nowrap"
                    >
                        {line}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

const GrowthChart = ({ color }: { color: string }) => {
    const data = useMemo(() => Array.from({ length: 12 }).map((_, i) => ({
        time: i,
        value: 40 + Math.sin(i * 0.8) * 20 + Math.random() * 30
    })), []);

    return (
        <div className="h-40 w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={color} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: '#050614', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            fontSize: '10px',
                            fontFamily: 'monospace'
                        }} 
                    />
                    <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke={color} 
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                        animationDuration={2000}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

const NodeDetailOverlay = ({ nodeKey, onClose }: { nodeKey: string | null, onClose: () => void }) => {
    const content = nodeKey ? NODE_CONTENT[nodeKey] : null;
    const accentColor = content ? (nodeKey === 'NAVIGATOR_CORE' ? '#007AFF' : '#ffffff') : '#fff';

    return (
        <AnimatePresence>
            {content && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 flex items-center justify-center p-6 sm:p-12 pointer-events-none"
                >
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="w-full max-w-5xl max-h-[90vh] overflow-hidden backdrop-blur-3xl bg-[#050614]/90 border border-white/10 p-10 rounded-sm shadow-[0_0_100px_rgba(0,122,255,0.2)] relative pointer-events-auto flex flex-col"
                    >
                        <button 
                            onClick={onClose}
                            className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors cursor-pointer uppercase tracking-widest text-[10px]"
                        >
                            [ CLOSE ]
                        </button>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 font-sans overflow-y-auto pr-4 custom-scrollbar">
                            {/* Left Column: Context & Core Stats */}
                            <div className="space-y-10 lg:col-span-1">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                                        <span className="text-[10px] text-white/40 tracking-[0.4em]">NODE ACTIVE</span>
                                    </div>
                                    <h2 className="text-white text-3xl font-light tracking-[0.2em] mb-4 uppercase leading-tight">{content.title}</h2>
                                    <div className="w-16 h-[1px] bg-blue-500/50 mb-8" />
                                    <p className="text-white/60 text-sm leading-relaxed font-light font-sans">
                                        {content.description}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[10px] text-white/40 tracking-[0.3em] font-medium border-b border-white/5 pb-2">TELEMETRY MATRIX</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {content.stats.map((stat, i) => (
                                            <div key={i} className="p-4 bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors">
                                                <span className="block text-[9px] text-blue-400/70 mb-1 tracking-widest uppercase">{stat.label}</span>
                                                <span className="text-white text-lg font-light tracking-widest">{stat.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {content.intervention && (
                                    <div className="space-y-4 p-4 bg-blue-500/5 border border-blue-500/10">
                                        <h3 className="text-[10px] text-blue-400 tracking-[0.3em] font-medium uppercase">Intervention Impact</h3>
                                        <div className="space-y-4">
                                            {content.intervention.map((item, i) => (
                                                <div key={i} className="space-y-2">
                                                    <div className="flex justify-between text-[10px]">
                                                        <span className="text-white/60">{item.label} Improvement</span>
                                                        <span className="text-blue-400">+{Math.round(((item.after - item.before) / item.before) * 100)}%</span>
                                                    </div>
                                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden flex">
                                                        <div className="h-full bg-white/20" style={{ width: `${item.before}%` }} />
                                                        <div className="h-full bg-blue-500 animate-pulse" style={{ width: `${item.after - item.before}%` }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-white/5">
                                    <h3 className="text-[10px] text-white/40 tracking-[0.3em] font-medium mb-4">DATA GATHERING STREAM</h3>
                                    <DataStream />
                                </div>
                            </div>

                            {/* Center/Right Column: Visualization & Deep Metrics */}
                            <div className="lg:col-span-2 space-y-10">
                                <div className="p-8 bg-white/[0.02] border border-white/5 rounded-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-[10px] text-white/40 tracking-[0.3em] font-medium uppercase leading-tight">Growth Projection Matrix (24H)</h3>
                                        <div className="flex gap-4">
                                            <span className="flex items-center gap-2 text-[9px] text-white/30"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> REALTIME</span>
                                            <span className="flex items-center gap-2 text-[9px] text-white/30"><div className="w-1.5 h-1.5 rounded-full bg-white/20" /> HISTORICAL</span>
                                        </div>
                                    </div>
                                    <GrowthChart color={accentColor} />
                                    <div className="grid grid-cols-3 gap-8 mt-8 border-t border-white/5 pt-6">
                                        <div>
                                            <span className="block text-[9px] text-white/30 uppercase mb-1">Volatility</span>
                                            <span className="text-white font-mono text-xs">+/- 0.042</span>
                                        </div>
                                        <div>
                                            <span className="block text-[9px] text-white/30 uppercase mb-1">Sync Latency</span>
                                            <span className="text-white font-mono text-xs">12.4ms</span>
                                        </div>
                                        <div>
                                            <span className="block text-[9px] text-white/30 uppercase mb-1">Signal Quality</span>
                                            <span className="text-white font-mono text-xs">Pristine</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <h3 className="text-[10px] text-white/40 tracking-[0.3em] font-medium uppercase border-b border-white/5 pb-2">Neural Linkage Specifications</h3>
                                        <div className="space-y-4">
                                            {[
                                                { label: 'Protocols', value: 'Quantum-Safe' },
                                                { label: 'Identity Mapping', value: 'Dynamic' },
                                                { label: 'Sync Depth', value: 'Recursive' },
                                                { label: 'Compression', value: '0.008x' }
                                            ].map((spec, i) => (
                                                <div key={i} className="flex justify-between items-center text-[10px]">
                                                    <span className="text-white/30 uppercase">{spec.label}</span>
                                                    <span className="text-white/80 font-mono italic">{spec.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-[10px] text-white/40 tracking-[0.3em] font-medium uppercase border-b border-white/5 pb-2">System Insight</h3>
                                        <div className="p-5 bg-blue-500/5 border-l-2 border-blue-500/50 italic">
                                            <p className="text-white/50 text-[11px] leading-relaxed">
                                                {content.footer || "System nodes are operating at peak efficiency. Data gathering is passive, non-intrusive, and encrypted at the source layer."}
                                            </p>
                                        </div>
                                        {nodeKey === 'Institutional' && (
                                            <div className="p-4 border border-white/5 bg-white/[0.01]">
                                                <span className="block text-[8px] text-white/30 mb-2 tracking-widest uppercase">Regional Heatmap (India)</span>
                                                <div className="aspect-video bg-blue-500/5 flex items-center justify-center border border-white/5 opacity-50 text-[8px] text-white/20">
                                                    [ DISTRICT DATA NETWORK VISUALIZED ]
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-4 pt-2">
                                            <div className="h-1 flex-1 bg-white/5 overflow-hidden">
                                                <motion.div 
                                                    initial={{ x: "-100%" }}
                                                    animate={{ x: "0%" }}
                                                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                                                    className="w-1/2 h-full bg-blue-500/40" 
                                                />
                                            </div>
                                            <span className="text-[8px] text-blue-400 font-mono animate-pulse">PROCESSING...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const HUD = ({ hoveredModule, hoveredColor }: { hoveredModule: string | null, hoveredColor: string | null }) => {
    const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })), 1000 * 60);
        return () => clearInterval(timer);
    }, []);

    const legendDescriptions: Record<string, string> = {
        'Physical': 'Optimizing biological readiness and energy systems.',
        'Engagement': 'Monitoring vital participation and focus metrics.',
        'Emotional': 'Analyzing psychometric resonance and confidence.',
        'Cognitive': 'Tracking creative synthesis and logical patterns.',
        'Purpose': 'Calibrating long-range intentionality and goals.',
        'Leadership': 'Orchestrating collaborative group intelligence.',
        'Curiosity': 'Synthesizing novel discovery vectors.',
        'Collaboration': 'Measuring social synergy frameworks.',
        'Focus': 'Evaluating deep-work cognitive load.',
        'Resilience': 'Calibrating adaptive recovery capacities.',
        'Innovation': 'Stochastic generation of new breakthroughs.',
        'Communication': 'Encoding semiotic exchange efficiency.',
        'Growth': 'Iterating developmental evolution logic.',
        'Institutional': 'District-level intelligence and school network metrics.',
        'Teacher': 'Classroom engagement heatmaps and real-time alerts.',
        'Parent': 'Personalized student strength mapping and home growth insights.',
        'Creativity': 'Monitoring non-linear problem solving and novel output.',
    };

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-12 text-white font-sans uppercase tracking-[0.2em] text-[10px]">
            {/* Top HUD */}
            <div className="flex justify-between items-start w-full opacity-60">
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 1.5 }}
                    className="flex flex-col gap-1 border-l border-white/20 pl-4 py-1"
                >
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-1.5 h-1.5 rounded-full animate-pulse transition-colors duration-700" 
                            style={{ backgroundColor: hoveredColor || '#3b82f6' }}
                        />
                        <span className="font-medium">NEURAL LINK: {hoveredModule ? 'SYNCING' : 'STABLE'}</span>
                    </div>
                    <span className="text-[8px] opacity-50">LATENCY: 14MS // ENCRYPTION: OPTIMAL</span>
                </motion.div>
                
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 1.5 }}
                    className="flex flex-col items-end gap-1 border-r border-white/20 pr-4 py-1"
                >
                    <span className="font-medium tracking-widest">{time}</span>
                    <span className="text-[8px] opacity-50">LOCATION: PACIFIC NODE 01</span>
                </motion.div>
            </div>



            {/* Bottom Legend */}
            <div className="flex justify-start items-end">
                <AnimatePresence mode="wait">
                    {hoveredModule && (
                        <motion.div 
                            key={hoveredModule}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="backdrop-blur-3xl bg-white/[0.03] p-8 border border-white/5 rounded-sm max-w-sm shadow-[0_32px_64px_-12px_rgba(0,0,0,1)]"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-4 h-[1px]" style={{ backgroundColor: hoveredColor! }} />
                                <h3 className="font-bold text-xs tracking-[0.25em]" style={{ color: hoveredColor! }}>{hoveredModule}</h3>
                            </div>
                            <p className="normal-case tracking-normal opacity-60 text-xs leading-relaxed font-light">
                                {legendDescriptions[hoveredModule]}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default function NavigatorScene() {
    const [hoveredData, setHoveredData] = useState<{label: string | null, color: string | null}>({ label: null, color: null });
    const [selectedNode, setSelectedNode] = useState<string | null>(null);

    return (
        <div className="h-screen w-full relative bg-[#050614] overflow-hidden">
            <Canvas dpr={[1, 2]} className="w-full h-full">
                <Scene 
                    setHoveredModule={(label, color) => setHoveredData({ label, color })} 
                    onNodeClick={(label) => setSelectedNode(label)}
                />
            </Canvas>
            <HUD hoveredModule={hoveredData.label} hoveredColor={hoveredData.color} />
            <NodeDetailOverlay nodeKey={selectedNode} onClose={() => setSelectedNode(null)} />
        </div>
    );
}
