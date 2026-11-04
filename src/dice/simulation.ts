import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";
import { DieDefinition, getSnapTarget, TRAY_FLOOR_Y } from "./geometry";

/** Pluggable RNG so a throw can be replayed deterministically in tests. */
export type Random = () => number;

let ready: Promise<void> | null = null;

/** Loads the physics engine's WebAssembly. Safe to call any number of times. */
export const initPhysics = (): Promise<void> => (ready ??= RAPIER.init());

export const SIM = {
  /**
   * Strong for the scene's scale: a die here is ~0.8 units across, so real
   * gravity would make it fall like a cardboard box in slow motion.
   */
  gravity: 32,
  /** Fixed physics step. Rendering at any frame rate replays the same throw. */
  step: 1 / 120,
  /** Cap on steps per frame, so a stalled tab catches up instead of freezing. */
  maxStepsPerFrame: 8,

  /** Inner radius of the tray wall, matching CyberTray's WALL_RADIUS. */
  wallRadius: 3.5,
  /** The wall reaches well above the visible rim, so no die can fly out. */
  wallHeight: 4,
  wallSegments: 32,

  /** Height the hand releases the dice from, and the upward flick it gives them. */
  throwHeight: 2.4,
  throwLift: 2.5,

  dieFriction: 0.4,
  /**
   * Lively on purpose. Rapier averages the two surfaces' values, and at 0.3 a
   * die landed with a thud and barely left the floor again -- it read as a
   * brick rather than as a die on a hard tray.
   */
  dieRestitution: 0.55,
  floorFriction: 0.55,
  floorRestitution: 0.6,
  wallRestitution: 0.65,
  /** Barely any: a die should tumble on its own corners, not through syrup. */
  linearDamping: 0.03,
  angularDamping: 0.1,

  /** Below these speeds a die counts as still. */
  stillSpeed: 0.05,
  stillSpin: 0.12,
  /** How long it must stay still before its face is read. */
  stillTime: 0.2,
  /**
   * A die still but tilted further than this from flat is cocked -- propped
   * on the wall or another die. At a real table it gets nudged; so here.
   */
  cockedTilt: 0.2,
  /** A die resting this far above the floor is lying on another die. */
  stackedHeight: 0.15,
  /** After this long a throw is nudged, so nothing can hang for ever. */
  timeout: 8,
} as const;

export interface SimDie {
  body: RAPIER.RigidBody;
  definition: DieDefinition;
  /** Seconds spent continuously still. */
  still: number;
  /** The face value read once the die settles, or null while it moves. */
  value: number | null;
}

const quaternion = new THREE.Quaternion();

/** One tray and the dice thrown into it. Owns a physics world; call `free`. */
export class DiceSimulation {
  world: RAPIER.World;
  dice: SimDie[] = [];
  private accumulator = 0;
  private elapsed = 0;
  private random: Random = Math.random;

  constructor() {
    this.world = DiceSimulation.createWorld();
  }

  /**
   * A fresh world, tray included. Each throw gets its own: Rapier is
   * deterministic only from an identical starting state, and a world that has
   * had bodies added and removed is not one -- the same seed threw differently.
   */
  private static createWorld(): RAPIER.World {
    const world = new RAPIER.World({ x: 0, y: -SIM.gravity, z: 0 });
    world.timestep = SIM.step;
    DiceSimulation.buildTray(world);
    return world;
  }

  private static buildTray(world: RAPIER.World) {
    const floor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(SIM.wallRadius + 1, 0.5, SIM.wallRadius + 1)
        .setTranslation(0, TRAY_FLOOR_Y - 0.5, 0)
        .setFriction(SIM.floorFriction)
        .setRestitution(SIM.floorRestitution),
      floor,
    );

    // The round wall, as a ring of slabs set just outside the visible wall.
    const thickness = 0.5;
    const centre = SIM.wallRadius + thickness / 2;
    const halfWidth = centre * Math.tan(Math.PI / SIM.wallSegments) + 0.02;
    for (let i = 0; i < SIM.wallSegments; i++) {
      const angle = (i / SIM.wallSegments) * Math.PI * 2;
      const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(thickness / 2, SIM.wallHeight / 2, halfWidth)
          .setTranslation(Math.cos(angle) * centre, TRAY_FLOOR_Y + SIM.wallHeight / 2, Math.sin(angle) * centre)
          .setRotation(rotation)
          .setRestitution(SIM.wallRestitution),
        floor,
      );
    }
  }

  /**
   * Throws a fresh set of dice in from one side of the tray, the way a hand
   * does: as a loose cluster, flung across it with a spin.
   */
  throw(definitions: DieDefinition[], random: Random = Math.random) {
    this.world.free();
    this.world = DiceSimulation.createWorld();
    this.dice = [];
    this.random = random;
    this.accumulator = 0;
    this.elapsed = 0;

    const side = random() * Math.PI * 2;
    const inward = new THREE.Vector3(-Math.cos(side), 0, -Math.sin(side));
    const across = new THREE.Vector3(-inward.z, 0, inward.x);
    const speed = 7 + random() * 3;

    this.dice = definitions.map((definition, index) => {
      // Dice beyond the first spread out round the hand, not stacked up.
      const ring = index === 0 ? 0 : 0.45 + 0.12 * index;
      const angle = index * 2.4;
      const start = inward
        .clone()
        .multiplyScalar(-2.3 + Math.cos(angle) * ring * 0.5)
        .addScaledVector(across, Math.sin(angle) * ring);
      const aim = inward.clone().multiplyScalar(speed).addScaledVector(across, (random() - 0.5) * 3);

      randomOrientation(quaternion, random);
      const spin = randomAxis(random).multiplyScalar(14 + random() * 12);

      const body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(start.x, SIM.throwHeight + random() * 0.6, start.z)
          .setRotation({ x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w })
          .setLinvel(aim.x, SIM.throwLift + random() * 1.5, aim.z)
          .setAngvel({ x: spin.x, y: spin.y, z: spin.z })
          .setLinearDamping(SIM.linearDamping)
          .setAngularDamping(SIM.angularDamping)
          .setCcdEnabled(true),
      );
      this.world.createCollider(hullOf(definition).setDensity(1), body);

      return { body, definition, still: 0, value: null };
    });
  }

  /** Advances the simulation by a frame. Returns true once every die has settled. */
  step(delta: number): boolean {
    if (this.dice.length === 0) return false;
    this.accumulator = Math.min(this.accumulator + delta, SIM.step * SIM.maxStepsPerFrame);

    while (this.accumulator >= SIM.step) {
      this.accumulator -= SIM.step;
      this.elapsed += SIM.step;
      this.world.step();
      this.dice.forEach(die => this.track(die));
    }
    return this.settled;
  }

  get settled(): boolean {
    return this.dice.length > 0 && this.dice.every(die => die.value !== null);
  }

  get values(): number[] {
    return this.dice.map(die => die.value ?? 0);
  }

  /** Watches one die come to rest and reads the face on top when it does. */
  private track(die: SimDie) {
    if (die.value !== null) return;

    const { body } = die;
    const still =
      body.isSleeping() ||
      (length(body.linvel()) < SIM.stillSpeed && length(body.angvel()) < SIM.stillSpin);
    die.still = still ? die.still + SIM.step : 0;

    const timedOut = this.elapsed > SIM.timeout;
    if (die.still < SIM.stillTime && !timedOut) return;

    const r = body.rotation();
    quaternion.set(r.x, r.y, r.z, r.w);
    const target = getSnapTarget(quaternion, die.definition.directions);

    // Cocked: tilted against the wall, or lying on top of another die. Either
    // way it is not a result a table would accept.
    const raised = body.translation().y - die.definition.restHeight > SIM.stackedHeight;
    if (raised || quaternion.angleTo(target.quaternion) > SIM.cockedTilt) {
      this.nudge(die);
      return;
    }

    die.value = die.definition.values[target.index];
  }

  /** Knocks a cocked die off whatever it is leaning on. */
  private nudge(die: SimDie) {
    const mass = die.body.mass();
    const { random } = this;
    // Towards the middle, where there is room to fall flat: a random shove
    // just knocked a die wedged at the wall back into the same spot.
    const t = die.body.translation();
    const reach = Math.hypot(t.x, t.z) || 1;
    die.body.applyImpulse(
      {
        x: (-t.x / reach + (random() - 0.5)) * mass * 2,
        y: mass * 2.5,
        z: (-t.z / reach + (random() - 0.5)) * mass * 2,
      },
      true,
    );
    const twist = randomAxis(random).multiplyScalar(mass * 0.3);
    die.body.applyTorqueImpulse({ x: twist.x, y: twist.y, z: twist.z }, true);
    die.still = 0;
  }

  /** Copies a die's pose into a mesh. */
  pose(index: number, target: THREE.Object3D) {
    const body = this.dice[index]?.body;
    if (!body) return;
    const t = body.translation();
    const r = body.rotation();
    target.position.set(t.x, t.y, t.z);
    target.quaternion.set(r.x, r.y, r.z, r.w);
  }

  free() {
    this.world.free();
  }
}

const length = (v: { x: number; y: number; z: number }) => Math.hypot(v.x, v.y, v.z);

const hulls = new WeakMap<DieDefinition, Float32Array>();

/** The die's collision shape: the convex hull of its own corners. */
const hullOf = (definition: DieDefinition): RAPIER.ColliderDesc => {
  let points = hulls.get(definition);
  if (!points) {
    points = new Float32Array(definition.vertices.flatMap(v => [v.x, v.y, v.z]));
    hulls.set(definition, points);
  }
  const hull = RAPIER.ColliderDesc.convexHull(points);
  if (!hull) throw new Error("A die's corners do not form a solid");
  return hull.setFriction(SIM.dieFriction).setRestitution(SIM.dieRestitution);
};

/**
 * A uniformly random axis. Drawing x, y and z independently fills a cube and
 * favours its diagonals, which shows up as a bias in what the die lands on.
 */
const randomAxis = (random: Random): THREE.Vector3 => {
  const z = 2 * random() - 1;
  const angle = 2 * Math.PI * random();
  const ring = Math.sqrt(1 - z * z);
  return new THREE.Vector3(ring * Math.cos(angle), ring * Math.sin(angle), z);
};

/** A uniformly random orientation (Shoemake's method). */
const randomOrientation = (target: THREE.Quaternion, random: Random): void => {
  const u1 = random();
  const u2 = 2 * Math.PI * random();
  const u3 = 2 * Math.PI * random();
  const a = Math.sqrt(1 - u1);
  const b = Math.sqrt(u1);
  target.set(a * Math.sin(u2), a * Math.cos(u2), b * Math.sin(u3), b * Math.cos(u3));
};
