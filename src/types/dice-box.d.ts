declare module '@3d-dice/dice-box' {
  interface DiceBoxConfig {
    id?: string;
    assetPath: string; // Required
    container?: string | HTMLElement;
    gravity?: number;
    mass?: number;
    friction?: number;
    restitution?: number;
    angularDamping?: number;
    linearDamping?: number;
    spinForce?: number;
    throwForce?: number;
    startingHeight?: number;
    settleTimeout?: number;
    offscreen?: boolean;
    delay?: number;
    lightIntensity?: number;
    enableShadows?: boolean;
    shadowTransparency?: number;
    theme?: string;
    preloadThemes?: string[];
    externalThemes?: Record<string, string>;
    themeColor?: string;
    scale?: number;
    suspendSimulation?: boolean;
    origin?: string;
    onBeforeRoll?: (notation: string) => void;
    onDieComplete?: (result: DieResult) => void;
    onRollComplete?: (results: RollResult[]) => void;
    onRemoveComplete?: () => void;
    onThemeConfigLoaded?: () => void;
    onThemeLoaded?: () => void;
  }

  interface DieResult {
    groupId: string;
    rollId: string;
    id: number;
    theme: string;
    type: string;
    sides: number;
    value: number;
    roll: {
      x: number;
      y: number;
      z: number;
    };
    position: {
      x: number;
      y: number;
      z: number;
    };
    rotation: {
      x: number;
      y: number;
      z: number;
    };
    scale: number;
    sound: string;
  }

  interface RollResult {
    notation: string;
    qty: number;
    sides: number;
    value: number;
    rolls: DieResult[];
  }

  export default class DiceBox {
    constructor(config: DiceBoxConfig);
    init(): Promise<void>;
    roll(notation: string | object): Promise<RollResult[]>;
    removeDie(dieId: number): void;
    updateConfig(config: Partial<DiceBoxConfig>): void;
    clear(): void;
  }
}