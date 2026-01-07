"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Box, Cylinder, Sphere, Torus, Cone } from "@react-three/drei";
import * as THREE from "three";

// --- CONSTANTS ---
// Target: "RAIoT" text (Right side)
const TARGET_POS = new THREE.Vector3(-0.3, 3.5, 0);
const START_POS = new THREE.Vector3(14, 0, 2);
const FLIGHT_DURATION = 3.5;

// Animation Params
const HOVER_Y_AMP = 0.15;
const HOVER_Y_SPEED = 1.2;
const HOVER_ROT_AMP = 0.05;

// Utils
function damp(target: number, current: number, speed: number, delta: number) {
    return current + (target - current) * (1 - Math.exp(-speed * delta));
}

// --- VISUAL COMPONENTS ---

const DroneBody = () => {
    return (
        <group>
            {/* --- FUSELAGE: Curved & Aerodynamic --- */}
            {/* Main Central Pod (Graphite) */}
            <Sphere args={[0.35, 32, 32]} scale={[1, 0.4, 1.2]} position={[0, 0, 0]}>
                <meshStandardMaterial
                    color="#1a1a1a" // Dark Graphite
                    roughness={0.3}
                    metalness={0.8}
                    envMapIntensity={1}
                />
            </Sphere>

            {/* Cyan Accent Ring (Tech Line) around body */}
            <Torus args={[0.36, 0.015, 16, 64]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1.2, 1]}>
                <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} toneMapped={false} />
            </Torus>

            {/* Front Camera/Sensor Dome (Black Glass) */}
            <Sphere args={[0.15, 32, 16]} position={[0, 0, 0.35]} scale={[1, 0.8, 0.5]}>
                <meshStandardMaterial color="#000" roughness={0.1} metalness={1} />
            </Sphere>

            {/* Glowing Front Eyes (Red LEDs) */}
            <Sphere args={[0.03, 16, 16]} position={[-0.12, 0, 0.42]}>
                <meshBasicMaterial color="#ff0000" toneMapped={false} />
            </Sphere>
            <Sphere args={[0.03, 16, 16]} position={[0.12, 0, 0.42]}>
                <meshBasicMaterial color="#ff0000" toneMapped={false} />
            </Sphere>

            {/* --- ARMS: Sleek Cylinders with LEDs --- */}
            <DroneArm x={-1} z={0.8} rotation={0.5} />
            <DroneArm x={1} z={0.8} rotation={-0.5} />
            <DroneArm x={-1} z={-0.8} rotation={-0.5} />
            <DroneArm x={1} z={-0.8} rotation={0.5} />

            {/* Rotors mounted on Arms */}
            <RotorMount x={-0.6} z={0.5} clockwise={true} />
            <RotorMount x={0.6} z={0.5} clockwise={false} />
            <RotorMount x={-0.6} z={-0.5} clockwise={false} />
            <RotorMount x={0.6} z={-0.5} clockwise={true} />
        </group>
    );
};

const DroneArm = ({ x, z, rotation }: { x: number, z: number, rotation: number }) => {
    // Calculating arm position to connect body to rotor area
    // Simplified visual representation: Angled struts
    const armLen = 0.5;
    const angle = Math.atan2(z, x);

    return (
        <group rotation={[0, -angle, 0]}>
            {/* Arm Strut */}
            <Cylinder args={[0.04, 0.06, 0.6, 12]} rotation={[Math.PI / 2, 0, 0]} position={[0.35, 0, 0]}>
                <meshStandardMaterial color="#222" roughness={0.5} metalness={0.7} />
            </Cylinder>

            {/* LED on Arm Tip */}
            <Box args={[0.05, 0.02, 0.05]} position={[0.65, 0.02, 0]}>
                <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={3} toneMapped={false} />
            </Box>
        </group>
    );
};


const RotorMount = ({ x, z, clockwise }: { x: number, z: number, clockwise: boolean }) => {
    return (
        <group position={[x, 0, z]}>
            {/* Motor Housing */}
            <Cylinder args={[0.08, 0.06, 0.15, 16]} >
                <meshStandardMaterial color="#111" metalness={0.8} roughness={0.4} />
            </Cylinder>

            {/* Cyan Accent Ring on Motor */}
            <Torus args={[0.08, 0.005, 16, 32]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={1.5} />
            </Torus>

            {/* Blade */}
            <RotorBlade clockwise={clockwise} />
        </group>
    );
};

const RotorBlade = ({ clockwise }: { clockwise: boolean }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((_, delta) => {
        if (ref.current) ref.current.rotation.y += delta * 35 * (clockwise ? 1 : -1);
    });
    return (
        <group position={[0, 0.08, 0]}>
            {/* Spinning Blades - Dark Matte Charcoal with High Specular */}
            <group ref={ref}>
                <Box args={[1.2, 0.015, 0.12]}>
                    <meshStandardMaterial
                        color="#111" // Dark Charcoal
                        roughness={0.15} // Sharp highlights
                        metalness={0.9} // Metallic reflection
                        envMapIntensity={1.5}
                    />
                </Box>
                <Box args={[0.12, 0.015, 1.2]}>
                    <meshStandardMaterial
                        color="#111"
                        roughness={0.15}
                        metalness={0.9}
                        envMapIntensity={1.5}
                    />
                </Box>
            </group>

            {/* RIM LIGHT DISC: Thin glowing ring at blade tips to outline rotation */}
            <Torus args={[0.6, 0.008, 8, 64]} rotation={[Math.PI / 2, 0, 0]}>
                <meshBasicMaterial color="#00ffff" transparent opacity={0.15} />
            </Torus>

            {/* MOTION BLUR DISC: Subtle sweep effect */}
            <Cylinder args={[0.6, 0.6, 0.005, 32]}>
                <meshStandardMaterial
                    color="#222"
                    transparent
                    opacity={0.08}
                    roughness={0.1}
                    metalness={0.8}
                />
            </Cylinder>
        </group>
    );
};

const DroneRays = ({ active }: { active: boolean }) => {
    const ref = useRef<THREE.Group>(null);
    const matRef = useRef<THREE.MeshBasicMaterial>(null);
    const [phase, setPhase] = useState<"hidden" | "glitch" | "stable">("hidden");
    const timer = useRef(0);

    useEffect(() => {
        if (active) {
            setPhase("glitch");
            timer.current = 0;
        } else {
            setPhase("hidden");
        }
    }, [active]);

    useFrame((state, delta) => {
        if (!ref.current || !matRef.current) return;

        // Timer
        if (active) timer.current += delta;

        // Phase Transition
        if (phase === "glitch" && timer.current > 0.8) {
            setPhase("stable");
        }

        if (phase === "hidden") {
            matRef.current.opacity = damp(0, matRef.current.opacity, 10, delta);
            ref.current.scale.setScalar(1);
        } else if (phase === "glitch") {
            // Glitch: Flicker & Jitter
            const noise = Math.random();
            const flicker = noise > 0.4 ? 0.35 : 0.05;
            const jitterY = (Math.random() - 0.5) * 0.1;
            const scaleJitter = 1 + (Math.random() - 0.5) * 0.3;

            matRef.current.opacity = flicker;
            ref.current.scale.set(scaleJitter, 1, scaleJitter);
            ref.current.position.y = -2.1 + jitterY;
        } else if (phase === "stable") {
            // Stable: Breathing
            const t = state.clock.elapsedTime;
            const breath = 1 + Math.sin(t * 1.5) * 0.08;
            const targetOp = 0.15 + Math.sin(t * 1.0) * 0.05;

            matRef.current.opacity = damp(targetOp, matRef.current.opacity, 2, delta);
            ref.current.scale.x = damp(breath, ref.current.scale.x, 2, delta);
            ref.current.scale.z = damp(breath, ref.current.scale.z, 2, delta);
            ref.current.position.y = damp(-2.1, ref.current.position.y, 4, delta);
        }
    });

    return (
        <group ref={ref} position={[0, -2.1, 0]}>
            {/* Main Beam - Volumetric White Soft */}
            <Cylinder args={[0.1, 1.8, 4.2, 32, 1, true]} position={[0, 0, 0]}>
                <meshBasicMaterial
                    ref={matRef}
                    color="#ffffff"
                    transparent
                    opacity={0}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </Cylinder>
            {/* Core Beam */}
            <Cylinder args={[0.04, 0.6, 4.2, 16, 1, true]} position={[0, 0, 0]}>
                <meshBasicMaterial
                    color="#e0f2fe"
                    transparent
                    opacity={active && phase === 'stable' ? 0.08 : 0}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </Cylinder>
        </group>
    );
};

const DroneScene = ({ onActivate, shouldStart }: { onActivate?: () => void, shouldStart: boolean }) => {
    const group = useRef<THREE.Group>(null);
    const startTime = useRef(0);
    const [landed, setLanded] = useState(false);
    const hasActivated = useRef(false);

    useFrame((state) => {
        if (!group.current) return;

        // Wait for signal to start
        if (!shouldStart) {
            group.current.position.copy(START_POS);
            return;
        }

        if (startTime.current === 0) startTime.current = state.clock.elapsedTime;

        const now = state.clock.elapsedTime;
        const elapsed = now - startTime.current;

        if (elapsed < FLIGHT_DURATION) {
            // --- FLIGHT PHASE ---
            const progress = elapsed / FLIGHT_DURATION;
            const ease = 1 - Math.pow(1 - progress, 3); // Ease out cubic

            // Position interpolation
            const currentPos = new THREE.Vector3().lerpVectors(START_POS, TARGET_POS, ease);
            group.current.position.copy(currentPos);

            // PHYSICS: Tilt & Bank
            const remaining = 1 - ease;
            const tilt = remaining * 0.4;

            group.current.rotation.z = tilt;
            group.current.rotation.y = Math.PI * 0.15 * remaining;

        } else {
            // --- HOVER PHASE ---
            if (!landed) {
                setLanded(true);
                if (onActivate && !hasActivated.current) {
                    onActivate();
                    hasActivated.current = true;
                }
            }

            const hoverT = now;
            const bob = Math.sin(hoverT * HOVER_Y_SPEED) * HOVER_Y_AMP;
            group.current.position.y = TARGET_POS.y + bob;

            // Stabilize rotation - Force perfectly level
            group.current.rotation.x = damp(0, group.current.rotation.x, 10, 0.016);
            group.current.rotation.z = damp(0, group.current.rotation.z, 10, 0.016);

            // Gentle Yaw
            const sway = Math.sin(hoverT * 0.5) * HOVER_ROT_AMP;
            group.current.rotation.y = sway;
        }
    });

    return (
        <group ref={group} scale={1.0}>
            <DroneBody />
            <DroneRays active={landed} />
        </group>
    );
};

export default function Drone3D({ className, style, onActivate, shouldStart = true }: { className?: string, style?: React.CSSProperties, onActivate?: () => void, shouldStart?: boolean }) {
    return (
        <div className={className} style={{ ...style, pointerEvents: 'none' }}>
            <Canvas className="pointer-events-none" camera={{ position: [0, 1.5, 12], fov: 40 }} gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
                {/* 1. SOFT AMBIENT LIGHTING (Visibility Base) */}
                <ambientLight intensity={1.0} color="#cceeff" />

                {/* 2. RIM LIGHT (Silhouette) - Strong Top-Back Light */}
                <spotLight
                    position={[0, 8, -5]}
                    intensity={10}
                    color="#ffffff"
                    angle={0.6}
                    penumbra={1}
                />

                {/* 3. KEY LIGHT (Front-Top-Right) - Soft Definition */}
                <spotLight
                    position={[5, 5, 5]}
                    intensity={5}
                    color="#ccfaff"
                    angle={0.5}
                    penumbra={1}
                />

                {/* 4. FILL LIGHT (Bottom) - Underbelly Lift */}
                <pointLight position={[0, -2, 2]} intensity={2} color="#00ffff" distance={10} />

                <DroneScene onActivate={onActivate} shouldStart={shouldStart} />
            </Canvas>
        </div>
    );
}
