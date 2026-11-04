import * as THREE from "three";
import { getSnapTarget } from "./geometry";

/** Pluggable RNG so a roll can be replayed deterministically in tests. */
export type Random = () => number;

export const PHYSICS = {
  gravity: 28,
  /** Physics iterations per rendered frame. */
  substeps: 4,
  /** Height the dice are thrown in from. */
  throwHeight: 4.2,
  /** Horizontal and upward speed they are thrown with. */
  throwForce: 10,
  throwLift: 3,
  /** Tumble they are thrown with, rad/s on each axis. */
  spinForce: 24,
  /** Clamp on frame time, so a stalled tab cannot tunnel a die through the floor. */
  maxDelta: 0.033,
  /** Centre-to-centre distance kept between two dice. Scales with DIE_SCALE. */
  dieSpacing: 0.74,
  dieRestitution: 0.6,
  /** Spin lost per second while two dice are grinding against each other. */
  dieContactDamping: 3,
  /**
   * How far from the tray centre a die's centre may travel before hitting the
   * wall. It is the tray's inner wall (3.5 in CyberTray) minus the largest die
   * circumradius (0.5, the d4 at DIE_SCALE), so a die stops flush against the
   * wall instead of poking through it.
   */
  trayRadius: 3.0,
  wallBounce: 1.6,

  /**
   * Bounciness of the tray floor. Worth more to the throw than it looks: most
   * of a corner-first landing goes into spin rather than into rebound, because
   * of the lever term in the contact solver, so a die needs a lively floor to
   * read as a die rather than as a lump of iron.
   */
  floorRestitution: 0.56,
  /**
   * Below this closing speed a contact is dead: no bounce at all. A die coming
   * to rest lands on its face over and over at a few centimetres a second, and
   * letting each of those little landings bounce leaves it jittering for ever
   * instead of stopping.
   */
  bounceThreshold: 0.42,
  /** Coulomb friction coefficient at the contact point. */
  floorFriction: 0.5,
  /**
   * Fraction of the contact point's slip cancelled per frame while the die is
   * resting on the floor. This is what couples spin to travel: without it a
   * tipping die turns on the spot instead of rolling over its own corner.
   */
  contactGrip: 0.35,
  /** Moment of inertia as a fraction of m*r^2. A solid sphere would be 0.4. */
  inertiaFactor: 0.6,
  /** Upward speed a resting die needs before it counts as leaving the floor. */
  liftOffSpeed: 0.6,
  /** Corners within this fraction of the radius of the lowest one are touching. */
  contactBand: 0.04,
  /**
   * Angular jitter given to a die that has come to a stop balanced on a corner.
   * That equilibrium only exists on paper -- no real floor is flat enough and no
   * real die is sharp enough to hold it -- and without the nudge a handful of
   * throws in a thousand stand there for ever.
   */
  balanceNudge: 2,
  /** How far past flat a die has to be leaning to count as balanced, not resting. */
  balanceTilt: 0.35,

  rollingResistance: 6.0,
  groundLinearDamping: 3.0,
  groundAngularDamping: 4.5,
  spinFriction: 9,
  /**
   * The tipping torque only resolves a balance; above this spin the die is
   * already tumbling under its own momentum. Without the gate it keeps feeding
   * a die balanced on a corner until it stands there spinning like a top.
   */
  tipSpinLimit: 3,
  /**
   * How still a die has to be before it starts coming to rest. Deliberately
   * loose: a discrete contact solver at a 60th of a second has a noise floor,
   * and demanding absolute stillness just leaves dice jittering for ever. The
   * settling phase below is what makes the stop look like a stop.
   */
  settleSpeed: 0.2,
  settleAngularSpeed: 0.8,
  /** Residual tilt tolerated when a die starts coming to rest. */
  settleAngle: 0.09,
  /**
   * Frames spent coming to rest once the die is done rolling.
   *
   * The die is barely moving by then -- a fraction of a degree a frame -- but
   * stopping it between one frame and the next still reads as the simulation
   * being switched off. Bleeding the last of the motion away over a sixth of a
   * second reads as the die settling, which is what is actually happening.
   */
  restingFrames: 18,
  /** Fraction of the leftover motion removed on each of those frames. */
  restingDecay: 0.26,
  /** Substeps a die may sit still but tilted before it is let fall flat (~0.6 s). */
  stallSubsteps: 144,
} as const;

/** Everything that makes one die move. Mutated in place each frame. */
export interface DieMotion {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  quaternion: THREE.Quaternion;
  grounded: boolean;
  landed: boolean;
  /** Frames spent so far bleeding off the last of the motion. */
  resting: number;
  /** Substeps spent nearly still but not yet flat. */
  stalled: number;
}

/** The slice of a neighbouring die needed to resolve a collision against it. */
export interface DieContact {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
}

export interface StepParams {
  delta: number;
  /** Height of the tray floor itself, not of the die resting on it. */
  trayFloor: number;
  /** Local-space directions that can point up, from the die definition. */
  directions: THREE.Vector3[];
  /** The solid's corner points. The die stands, bounces and tips on these. */
  vertices: THREE.Vector3[];
  /** Distance from the die's centre to its furthest corner. */
  radius: number;
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
  resting: 0,
  stalled: 0,
});

/** 0 for a touch below the bounce threshold, rising to 1 for a solid hit. */
const impactScale = (closingSpeed: number): number =>
  closingSpeed <= PHYSICS.bounceThreshold ? 0 : Math.min(1, closingSpeed / 3);

/** Successive dice are spaced by this angle, so no two launch on top of each other. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Throws the die back in from above with a fresh tumble. */
export const launchDie = (motion: DieMotion, dieIndex: number, random: Random = Math.random): DieMotion => {
  motion.landed = false;
  motion.grounded = false;
  motion.resting = 0;
  motion.stalled = 0;
  const { throwForce: force, spinForce: spin } = PHYSICS;
  // Spread round a ring rather than stacked: stacking each extra die higher put
  // a ten-die throw nine units up, out of the camera's view, and left the dice
  // falling onto one another for seconds.
  const angle = dieIndex * GOLDEN_ANGLE + random() * 0.5;
  const reach = Math.min(PHYSICS.trayRadius - 0.6, 0.5 + 0.35 * Math.sqrt(dieIndex));
  motion.position.set(
    Math.cos(angle) * reach + (random() - 0.5) * 0.4,
    PHYSICS.throwHeight + random() * 0.3,
    Math.sin(angle) * reach + (random() - 0.5) * 0.4,
  );
  motion.velocity.set(
    (random() - 0.5) * force,
    PHYSICS.throwLift + random() * 2,
    (random() - 0.5) * force,
  );
  setRandomSpin(motion.angularVelocity, spin, random);
  setRandomOrientation(motion.quaternion, random);
  return motion;
};

/**
 * A tumble about a uniformly random axis.
 *
 * Drawing the three components independently looks random but is not: it fills
 * a cube, so the axis favours the cube's diagonals and the die spins faster
 * about them. A hard throw tumbles enough times to wash that out, but a gentle
 * one does not, and the bias comes through in what the die lands on -- it cost
 * the d20 a chi-squared of 118 against a uniform result.
 */
const setRandomSpin = (target: THREE.Vector3, force: number, random: Random): void => {
  const z = 2 * random() - 1;
  const angle = 2 * Math.PI * random();
  const ring = Math.sqrt(1 - z * z);
  target
    .set(ring * Math.cos(angle), ring * Math.sin(angle), z)
    .multiplyScalar(force * (0.35 + 0.3 * random()));
};

/**
 * A uniformly random orientation (Shoemake's method).
 *
 * Three Euler angles drawn independently are not uniform over the space of
 * rotations -- they bunch up near the poles -- and the die is only in the air
 * for a couple of seconds, so how it starts still shows in how it lands.
 */
const setRandomOrientation = (quaternion: THREE.Quaternion, random: Random): void => {
  const u1 = random();
  const u2 = 2 * Math.PI * random();
  const u3 = 2 * Math.PI * random();
  const a = Math.sqrt(1 - u1);
  const b = Math.sqrt(u1);
  quaternion.set(a * Math.sin(u2), a * Math.cos(u2), b * Math.sin(u3), b * Math.cos(u3));
};

const spinBy = (quaternion: THREE.Quaternion, angularVelocity: THREE.Vector3, delta: number): void => {
  const spin = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(angularVelocity.x * delta, angularVelocity.y * delta, angularVelocity.z * delta),
  );
  quaternion.premultiply(spin).normalize();
};

// Scratch vectors. The step runs once per die per frame, so nothing in here
// allocates.
const rotated: THREE.Vector3[] = [];
const touchingIndices: number[] = [];
const contactPoint = new THREE.Vector3();
const contactVelocity = new THREE.Vector3();
const spinAtContact = new THREE.Vector3();
const tangent = new THREE.Vector3();
const lever = new THREE.Vector3();
const scratch = new THREE.Vector3();

/** Rotates the corners into world orientation and returns the lowest height. */
const rotateVertices = (vertices: THREE.Vector3[], quaternion: THREE.Quaternion): number => {
  let lowest = Infinity;
  for (let i = 0; i < vertices.length; i++) {
    if (!rotated[i]) rotated[i] = new THREE.Vector3();
    rotated[i].copy(vertices[i]).applyQuaternion(quaternion);
    if (rotated[i].y < lowest) lowest = rotated[i].y;
  }
  return lowest;
};

/**
 * Collects the corners resting on the floor, and their average.
 *
 * The count is the die's stability: three or more corners down means a face is
 * flat on the floor and the die can rest. One or two means it is balanced on a
 * corner or an edge, which gravity is about to resolve.
 */
const findContacts = (count: number, lowest: number, band: number): number => {
  contactPoint.set(0, 0, 0);
  let touching = 0;

  for (let i = 0; i < count; i++) {
    if (rotated[i].y > lowest + band) continue;
    touchingIndices[touching] = i;
    contactPoint.add(rotated[i]);
    touching += 1;
  }

  contactPoint.multiplyScalar(1 / touching);
  return touching;
};

/** Applies an impulse at a point on the die, to both the linear and spin state. */
const applyImpulse = (
  motion: DieMotion,
  at: THREE.Vector3,
  impulse: THREE.Vector3,
  inertia: number,
): void => {
  motion.velocity.add(impulse);
  motion.angularVelocity.addScaledVector(scratch.crossVectors(at, impulse), 1 / inertia);
};

/**
 * Resolves the floor contact at one corner: a normal impulse to stop it moving
 * down, and friction along whatever it is sliding towards.
 *
 * Every corner that is touching gets its own pass. Averaging them into one
 * point instead looks fine for a die landing flat, but it barely resists a die
 * slamming down out of a corner balance -- the averaged lever is almost nil --
 * so the die keeps its spin and tumbles on for ever.
 */
const resolveContact = (motion: DieMotion, at: THREE.Vector3, inertia: number): void => {
  contactVelocity
    .copy(motion.velocity)
    .add(spinAtContact.crossVectors(motion.angularVelocity, at));
  if (contactVelocity.y >= 0) return;

  lever.crossVectors(at, THREE.Object3D.DEFAULT_UP);
  const bounce = -contactVelocity.y > PHYSICS.bounceThreshold ? PHYSICS.floorRestitution : 0;
  const normalImpulse =
    (-(1 + bounce) * contactVelocity.y) / (1 + lever.lengthSq() / inertia);
  applyImpulse(motion, at, scratch.set(0, normalImpulse, 0), inertia);

  tangent.set(contactVelocity.x, 0, contactVelocity.z);
  const slip = tangent.length();
  if (slip < 1e-6) return;

  tangent.multiplyScalar(-1 / slip);
  lever.crossVectors(at, tangent);
  const wanted = slip / (1 + lever.lengthSq() / inertia);
  applyImpulse(
    motion,
    at,
    scratch.copy(tangent).multiplyScalar(Math.min(wanted, PHYSICS.floorFriction * normalImpulse)),
    inertia,
  );
};

/**
 * Bleeds off the last of a die's motion, over a handful of frames.
 *
 * Once armed this owns the die: contacts, gravity and the tipping torque are
 * all suspended, the way a rigid body engine stops integrating an island it
 * has put to sleep. That is not just an optimisation here. What is left at
 * this point is the solver's own noise floor -- a discrete contact pass at a
 * sixtieth of a second never reaches true stillness -- and while the forces
 * keep running they keep knocking the die back over the threshold, so it can
 * never hold still long enough to be called finished.
 *
 * The motion being bled away is under a degree a frame, so this reads as the
 * die settling rather than as an animation. Stopping it dead in a single frame
 * instead, which is the obvious thing to do, reads as the simulation being
 * switched off -- and that was what gave the ending away.
 */
const comeToRest = (
  motion: DieMotion,
  trayFloor: number,
  directions: THREE.Vector3[],
  vertices: THREE.Vector3[],
): number | null => {
  const target = getSnapTarget(motion.quaternion, directions);

  motion.resting += 1;
  motion.velocity.multiplyScalar(1 - PHYSICS.restingDecay);
  motion.angularVelocity.multiplyScalar(1 - PHYSICS.restingDecay);
  motion.quaternion.slerp(target.quaternion, PHYSICS.restingDecay);
  motion.position.y = trayFloor - rotateVertices(vertices, motion.quaternion);

  if (motion.resting <= PHYSICS.restingFrames) return null;

  motion.quaternion.copy(target.quaternion);
  motion.position.y = trayFloor - rotateVertices(vertices, motion.quaternion);
  motion.velocity.set(0, 0, 0);
  motion.angularVelocity.set(0, 0, 0);
  motion.landed = true;
  return target.index;
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
  if (motion.landed) return null;

  if (motion.resting > 0) {
    return comeToRest(motion, params.trayFloor, params.directions, params.vertices);
  }

  // Substepped. A contact resolved once a frame has to correct a whole frame of
  // approach in one go, which lands on the die as a single large kick -- worst
  // on the few-sided dice, whose corners reach furthest and so carry the most
  // leverage. Resolving several times a frame spreads the same total impulse
  // over a trajectory the die actually travels through.
  const delta = Math.min(params.delta, PHYSICS.maxDelta) / PHYSICS.substeps;
  for (let i = 0; i < PHYSICS.substeps; i++) {
    simulate(motion, params, delta);
    if (motion.resting > 0) break;
  }
  return null;
};

/** One substep: gravity, collisions, contact, and the test for coming to rest. */
const simulate = (motion: DieMotion, params: StepParams, delta: number): void => {
  const { trayFloor, directions, vertices, radius, index, neighbours, random = Math.random } = params;
  const { velocity, angularVelocity, position } = motion;
  // Moment of inertia per unit mass. Every impulse below is divided by it, so
  // hitting a die off-centre spins it by an amount that depends on its size.
  const inertia = PHYSICS.inertiaFactor * radius * radius;

  velocity.y -= PHYSICS.gravity * delta;
  position.addScaledVector(velocity, delta);
  spinBy(motion.quaternion, angularVelocity, delta);

  // Inter-dice elastic collision solver
  neighbours.forEach((other, otherIndex) => {
    if (otherIndex === index || !other) return;
    const diff = position.clone().sub(other.position);
    const dist = diff.length();
    if (dist >= PHYSICS.dieSpacing || dist <= 0.001) return;

    const normal = diff.multiplyScalar(1 / dist);
    // The push is sideways only. Along the full 3D normal a die leaning on its
    // neighbour was held up off the floor -- where nothing damps it -- and could
    // spin there, or hover pinned against the wall, for ever. Sideways, gravity
    // always gets the last word and every die ends up on the floor.
    normal.y = 0;
    if (normal.lengthSq() < 1e-6) normal.set(Math.cos(index), 0, Math.sin(index));
    normal.normalize();
    const overlap = PHYSICS.dieSpacing - dist;
    angularVelocity.multiplyScalar(Math.max(0, 1 - PHYSICS.dieContactDamping * delta));

    // Separate dice positions so they never overlap
    position.addScaledVector(normal, overlap * 0.5);

    const vNormal = velocity.clone().sub(other.velocity).dot(normal);
    if (vNormal < 0) {
      velocity.addScaledVector(normal, -(1 + PHYSICS.dieRestitution) * vNormal * 0.5);
      // The tumble scales with how hard they met. A flat kick fired on every
      // touch, so two dice resting against each other kept knocking each other
      // over and a full tray could fail to settle at all.
      const kick = 6 * impactScale(-vNormal);
      angularVelocity.x += (random() - 0.5) * kick;
      angularVelocity.z += (random() - 0.5) * kick;
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
      const kick = 8 * impactScale(vDot);
      angularVelocity.x += (random() - 0.5) * kick;
      angularVelocity.z += (random() - 0.5) * kick;
    }
  }

  // --- Floor contact, resolved at the corners that are actually touching ---
  const lowest = rotateVertices(vertices, motion.quaternion);

  // A die that is already down and rotates onto a corner lifts its own centre,
  // because the height it has to be held at is measured from whichever corner
  // hangs lowest. Reading that as taking off lets it fall again next frame, and
  // since nothing damps a die in flight it comes back with more energy than it
  // left with: a two-frame cycle it never escapes. Only real upward motion
  // counts as leaving the floor.
  if (position.y + lowest > trayFloor && (!motion.grounded || velocity.y > PHYSICS.liftOffSpeed)) {
    // In flight. Nothing damps a thrown die's tumble, so nothing damps it here.
    motion.grounded = false;
    return;
  }

  position.y = trayFloor - lowest;
  motion.grounded = true;

  const touching = findContacts(vertices.length, lowest, PHYSICS.contactBand * radius);

  // Resolved one corner at a time, so whichever goes first takes the largest
  // share of the correction. Walking them in index order hands that share to
  // the same corner of the solid every time, and the die grows a preference for
  // landing certain faces up -- worth a chi-squared of 92 against a fair d20.
  // Shuffling the order costs nothing and leaves no corner favoured.
  for (let i = touching - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const swap = touchingIndices[i];
    touchingIndices[i] = touchingIndices[j];
    touchingIndices[j] = swap;
  }
  for (let i = 0; i < touching; i++) {
    resolveContact(motion, rotated[touchingIndices[i]], inertia);
  }

  // The contact impulse is shared out between stopping the die and spinning it,
  // so on its own it never quite cancels gravity: a resting die keeps a steady
  // downward velocity that the floor silently absorbs, frame after frame. The
  // floor is holding the die up, so take the rest of it here.
  if (velocity.y < 0) velocity.y = 0;

  const target = getSnapTarget(motion.quaternion, directions);
  const tilt = motion.quaternion.angleTo(target.quaternion);

  if (
    touching < 3 &&
    tilt > PHYSICS.balanceTilt &&
    angularVelocity.length() < PHYSICS.settleAngularSpeed
  ) {
    // Standing up on a corner and out of energy: an equilibrium that nothing in
    // the real world is clean enough to hold. Tip the scales.
    //
    // The tilt condition is what keeps this honest. Without it the nudge fires
    // at a die lying a degree or two off flat -- which is not balanced, it is
    // resting -- and pumps a radian a second into it for ever.
    angularVelocity.x += (random() - 0.5) * PHYSICS.balanceNudge;
    angularVelocity.z += (random() - 0.5) * PHYSICS.balanceNudge;
  }

  if (touching < 3) {
    // Balanced on a corner or an edge: gravity torques the die over it. The
    // axis falls out of the cross product, so the die always tips the way its
    // weight is already leaning. Two fades, and the roll depends on both.
    //
    // By spin, because the torque's job is to resolve a balance rather than to
    // drive the tumble: left unfaded it stands a die up on a point and keeps it
    // spinning there. Fading rather than cutting off at a threshold matters --
    // a hard cut-off just moves the problem to a die oscillating either side
    // of it.
    //
    // By lean, because a die a degree off flat is not balanced, it is resting.
    // At full strength the torque throws a whole radian per second at such a
    // die every frame, which is far more than the settling thresholds allow,
    // so it could never be still long enough to stop.
    const spinFade = Math.max(0, 1 - angularVelocity.length() / PHYSICS.tipSpinLimit);
    const leanFade = Math.min(1, tilt / PHYSICS.balanceTilt);
    const tip = (PHYSICS.gravity * delta * spinFade * leanFade) / inertia;
    angularVelocity.x -= contactPoint.z * tip;
    angularVelocity.z += contactPoint.x * tip;
  }

  // Grip: cancel part of the contact point's slip every frame. This is the
  // coupling that turns spin into travel, so a tipping die rolls over its
  // corner rather than pivoting about its own centre.
  contactVelocity
    .copy(velocity)
    .add(spinAtContact.crossVectors(angularVelocity, contactPoint));
  velocity.x -= contactVelocity.x * PHYSICS.contactGrip;
  velocity.z -= contactVelocity.z * PHYSICS.contactGrip;

  velocity.x *= Math.max(0, 1 - PHYSICS.groundLinearDamping * delta);
  velocity.z *= Math.max(0, 1 - PHYSICS.groundLinearDamping * delta);
  angularVelocity.multiplyScalar(Math.max(0, 1 - PHYSICS.groundAngularDamping * delta));
  // Rolling resistance. Unlike the damping above it takes a fixed bite rather
  // than a proportional one, so it barely touches a die still bouncing about
  // and decisively stops one that has settled into trundling around the tray.
  const spin = angularVelocity.length();
  const bite = PHYSICS.rollingResistance * delta;
  angularVelocity.multiplyScalar(spin > bite ? (spin - bite) / spin : 0);
  // Drilling friction: a corner grinding into the floor resists being spun
  // about the contact normal much harder than it resists being tipped over.
  // Damping the whole spin this hard instead would stop a die that is merely
  // lying a few degrees off from ever falling flat.
  angularVelocity.y *= Math.max(0, 1 - PHYSICS.spinFriction * delta);

  const still =
    velocity.length() <= PHYSICS.settleSpeed && angularVelocity.length() <= PHYSICS.settleAngularSpeed;
  // Still, but leaning: usually against the tray wall, which stops the die
  // rolling the last few degrees flat. Left alone it crept over for seconds,
  // so after a moment it is let fall onto the face it is already leaning to.
  motion.stalled = still ? motion.stalled + 1 : 0;

  if (still && (tilt <= PHYSICS.settleAngle || motion.stalled > PHYSICS.stallSubsteps)) {
    motion.resting = 1;
  }
};
