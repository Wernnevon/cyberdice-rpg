declare module '@3d-dice/dice-box' {
  interface DiceBoxConfig {
    assetPath: string;
    width?: number;
    height?: number;
    gravity?: number;
    mass?: number;
    friction?: number;
    restitution?: number;
    angularDamping?: number;
    linearDamping?: number;
    theme?: string;
    themeColor?: string;
  }

  interface DiceResult {
    id: string;
    notation: string;
    sides: number;
    value: number;
    rollId: number;
    groupId: string;
  }

  interface RollResult {
    id: string;
    notation: string;
    results: DiceResult[];
    total: number;
  }

  class DiceBox {
    constructor(containerId: string, config: DiceBoxConfig);
    
    init(): Promise<void>;
    roll(notation: string): void;
    clear(): void;
    onRollComplete(results: RollResult[]): void;
    updateConfig(config: Partial<DiceBoxConfig>): void;
    
    // Scene properties
    scene?: {
      activeCamera?: {
        radius: number;
        beta: number;
      };
      render(): void;
    };
  }

  export default DiceBox;
}