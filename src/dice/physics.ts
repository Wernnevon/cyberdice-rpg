import * as THREE from "three";
import { getSnapTarget } from "./geometry";

/** Pluggable RNG so a roll can be replayed deterministically in tests. */
export type Random = () => number;

export const PHYSICS = {
  gravity: 28,
  /** Clamp on frame time, so a stalled tab cannot tunnel a die through the floor. */
  maxDelta: 0.033,
  /** Centre-to-centre distance kept between two dice. Scales with DIE_SCALE. */
  dieSpacing: 0.74,
  dieRestitution: 0.6,
  /**
   * How far from the tray centre a die's centre may travel before hitting the
   * wall. It is the tray's inner wall (3.5 in CyberTray) minus the largest die
   * circumradius (0.5, the d4 at DIE_SCALE), so a die stops flush against the
   * wall instead of poking through it.
   */
  trayRadius: 3.0,
  wallBounce: 1.6,
  floorRestitution: 0.4,
  floorFriction: 0.65,
  groundedSpeed: 0.8,
  groundLinearDamping: 8,
  groundAngularDamping: 10,
  airAngularDamping: 1,
  snapRate: 14,
  settleSpeed: 0.08,
  settleAngularSpeed: 0.25,
  /**
   * How close to its resting orientation a die must be before it is called
   * settled. The last frame snaps the remaining angle away, so this is the size
   * of that snap: at 0.08 it was a visible ~4 degree pop at the end of a throw.
   */
  settleAngle: 0.02,
} as const;

/** Everything that makes one die move. Mutated in place each frame. */
export interface DieMotion {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  quaternion: THREE.Quaternion;
  grounded: boolean;
  landed: boolean;
}

/** The slice of a neighbouring die needed to resolve a collision against it. */
export interface DieContact {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
}

export interface StepParams {
  delta: number;
  /**
   * Height of the die centre when its lowest point touches the tray floor. The
   * caller recomputes it per frame from the die's orientation, so a corner-first
   * landing is caught at the corner rather than at the resting face.
   */
  floorLevel: number;
  /**
   * Height of the die centre once it lies flat on a face. The final snap rotates
   * the die onto that face in one step, so the height it was clamped to for its
   * old orientation has to be corrected at the same time -- otherwise the die
   * comes to rest hanging fractionally above the floor.
   */
  restLevel?: number;
  /** Local-space directions that can point up, from the die definition. */
  directions: THREE.Vector3[];
  index: number;
  neighbours: (DieContact | undefined)[];
  random?: Random;
}

export const createMotion = (): DieMotion => ({
  position: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
  angularVelocity: new THREE.Vector3(),
  quaternion: new THREE.Quaternion(),
  grounded: false,
  landed: false,
});

/** Throws the die back in from above with a fresh tumble. */
export const launchDie = (motion: DieMotion, dieIndex: number, random: Random = Math.random): DieMotion => {
  motion.landed = false;
  motion.grounded = false;
  motion.position.set((random() - 0.5) * 2, 4.5 + dieIndex * 0.4, (random() - 0.5) * 2);
  motion.velocity.set((random() - 0.5) * 7, 5 + random() * 2, (random() - 0.5) * 7);
  motion.angularVelocity.set((random() - 0.5) * 30, (random() - 0.5) * 30, (random() - 0.5) * 30);
  motion.quaternion.setFromEuler(
    new THREE.Euler(random() * Math.PI, random() * Math.PI, random() * Math.PI),
  );
  return motion;
};

const spinBy = (quaternion: THREE.Quaternion, angularVelocity: THREE.Vector3, delta: number): void => {
  const spin = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(angularVelocity.x * delta, angularVelocity.y * delta, angularVelocity.z * delta),
  );
  quaternion.premultiply(spin).normalize();
};

/**
 * Advances one die by a frame.
 *
 * Returns the index into `directions` of the face that ended up on top once the
 * die comes to rest, or null while it is still moving. Reading the result from
 * the settled orientation (rather than drawing a number separately) is what keeps
 * the number on screen and the number in the score the same number.
 */
export const stepDie = (motion: DieMotion, params: StepParams): number | null => {
  const { floorLevel, restLevel, directions, index, neighbours, random = Math.random } = params;
  if (motion.landed) return null;

  const delta = Math.min(params.delta, PHYSICS.maxDelta);
  const { velocity, angularVelocity, position } = motion;

  velocity.y -= PHYSICS.gravity * delta;
  position.addScaledVector(velocity, delta);
  spinBy(motion.quaternion, angularVelocity, delta);

  // Inter-dice elastic collision solver
  neighbours.forEach((other, otherIndex) => {
    if (otherIndex === index || !other) return;
    const diff = position.clone().sub(other.position);
    const dist = diff.length();
    if (dist >= PHYSICS.dieSpacing || dist <= 0.001) return;

    const overlap = PHYSICS.dieSpacing - dist;
    const normal = diff.multiplyScalar(1 / dist);

    // Separate dice positions so they never overlap
    position.addScaledVector(normal, overlap * 0.5);

    const vNormal = velocity.clone().sub(other.velocity).dot(normal);
    if (vNormal < 0) {
      velocity.addScaledVector(normal, -(1 + PHYSICS.dieRestitution) * vNormal * 0.5);
      angularVelocity.x += (random() - 0.5) * 6;
      angularVelocity.z += (random() - 0.5) * 6;
    }
  });

  // Circular inner tray wall collision
  const distFromCenter = Math.hypot(position.x, position.z);
  if (distFromCenter > PHYSICS.trayRadius) {
    const normalX = position.x / distFromCenter;
    const normalZ = position.z / distFromCenter;

    position.x = normalX * PHYSICS.trayRadius;
    position.z = normalZ * PHYSICS.trayRadius;

    const vDot = velocity.x * normalX + velocity.z * normalZ;
    if (vDot > 0) {
      velocity.x -= PHYSICS.wallBounce * vDot * normalX;
      velocity.z -= PHYSICS.wallBounce * vDot * normalZ;
      angularVelocity.x += (random() - 0.5) * 8;
      angularVelocity.z += (random() - 0.5) * 8;
    }
  }

  // A die that is already down and is rotating onto its resting face pulls its
  // own floor out from under itself: floorLevel is measured from whichever
  // corner hangs lowest, so tipping from a corner onto a face drops it by most
  // of a circumradius -- three times over on a d4 -- far faster than gravity can
  // follow. Treating that as flight aborted the settle mid-slerp and bounced the
  // die instead, which is the stutter at the end of a throw. Only real upward
  // motion counts as taking off.
  if (position.y > floorLevel && (!motion.grounded || velocity.y > 0)) {
    motion.grounded = false;
    angularVelocity.multiplyScalar(Math.max(0, 1 - PHYSICS.airAngularDamping * delta));
    return null;
  }

  position.y = floorLevel;

  if (!motion.grounded) {
    // Bouncing: keep some vertical energy and convert skid into spin.
    velocity.y = Math.abs(velocity.y) * PHYSICS.floorRestitution;
    velocity.x *= PHYSICS.floorFriction;
    velocity.z *= PHYSICS.floorFriction;

    angularVelocity.x += velocity.z * 4;
    angularVelocity.z -= velocity.x * 4;

    if (Math.abs(velocity.y) < PHYSICS.groundedSpeed) motion.grounded = true;
    return null;
  }

  // Settling: slide to a stop while rotating onto the nearest flat face.
  velocity.y = 0;
  velocity.x *= Math.max(0, 1 - PHYSICS.groundLinearDamping * delta);
  velocity.z *= Math.max(0, 1 - PHYSICS.groundLinearDamping * delta);
  angularVelocity.multiplyScalar(Math.max(0, 1 - PHYSICS.groundAngularDamping * delta));

  const currentQuat = motion.quaternion.clone();
  const target = getSnapTarget(currentQuat, directions);
  motion.quaternion.slerp(target.quaternion, Math.min(1, PHYSICS.snapRate * delta));

  const settled =
    velocity.length() < PHYSICS.settleSpeed &&
    angularVelocity.length() < PHYSICS.settleAngularSpeed &&
    currentQuat.angleTo(target.quaternion) < PHYSICS.settleAngle;

  if (!settled) return null;

  velocity.set(0, 0, 0);
  angularVelocity.set(0, 0, 0);
  motion.quaternion.copy(target.quaternion);
  position.y = restLevel ?? floorLevel;
  motion.landed = true;
  return target.index;
};
