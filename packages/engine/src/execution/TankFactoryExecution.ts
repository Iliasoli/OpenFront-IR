import { TileRef } from "@openfront/engine-api/game/GameMap";
import { UnitType } from "@openfront/engine-api/game/GameTypes";
import {
  zInt,
  zRef,
  zTile,
} from "@openfront/engine-lib/snapshot/SnapshotType";
import { z } from "zod";
import { Execution, Game, Unit } from "../game/Game";
import { execSnapshotType } from "../snapshot/ExecutionSnapshot";
import type {
  ExecRecord,
  SnapshotReader,
  SnapshotWriter,
} from "../snapshot/SnapshotContext";
import { TankExecution } from "./TankExecution";

export class TankFactoryExecution implements Execution {
  private game!: Game;
  private active = true;
  private productionTicks = 0;
  private waitingTankId: number | undefined;
  private waitingTankTile: TileRef | undefined;

  constructor(private factory: Unit) {}

  init(game: Game): void {
    this.game = game;
  }

  tick(): void {
    if (!this.factory.isActive()) {
      this.active = false;
      return;
    }
    const range = this.game.config().trainStationMaxRange();
    const owner = this.factory.owner();
    if (this.waitingTankId !== undefined) {
      const waitingTank = this.game.unit(this.waitingTankId);
      if (
        waitingTank?.isActive() &&
        waitingTank.owner() === owner &&
        waitingTank.tile() === this.waitingTankTile
      ) {
        return;
      }
      // The factory's last tank left its spawn tile (or was removed/captured),
      // so start a fresh production interval.
      this.waitingTankId = undefined;
      this.waitingTankTile = undefined;
      this.productionTicks = 0;
    }
    const nearby = (type: UnitType) =>
      this.game
        .nearbyUnits(this.factory.tile(), range, type)
        .filter(({ unit }) => unit.owner() === owner).length;
    const oil = nearby(UnitType.OilMine);
    const gold = nearby(UnitType.GoldMine);
    if (gold === 0) return;
    const period = Math.max(10, 60 - oil * 10);
    if (++this.productionTicks < period) return;
    this.productionTicks = 0;
    const tile = owner.canBuild(UnitType.Tank, this.factory.tile());
    if (tile === false) return;
    const cost = BigInt(50_000 * Math.max(1, Math.ceil(3 / gold)));
    if (owner.gold() < cost) return;
    owner.removeGold(cost);
    const tank = owner.buildUnit(UnitType.Tank, tile, {});
    this.game.addExecution(new TankExecution(tank));
    this.waitingTankId = tank.id();
    this.waitingTankTile = tank.tile();
  }

  isActive(): boolean {
    return this.active;
  }
  activeDuringSpawnPhase(): boolean {
    return false;
  }
  snapshot(w: SnapshotWriter): ExecRecord {
    return TankFactoryExecutionSnapshot.write({
      active: this.active,
      initialized: this.game !== undefined,
      productionTicks: this.productionTicks,
      waitingTankId: this.waitingTankId,
      waitingTankTile: this.waitingTankTile,
      factory: w.unit(this.factory),
    });
  }
  restoreSnapshot(s: TankFactoryState, r: SnapshotReader): void {
    this.active = s.active;
    this.productionTicks = s.productionTicks;
    this.waitingTankId = s.waitingTankId;
    this.waitingTankTile = s.waitingTankTile;
    if (s.initialized) this.game = r.game;
    this.factory = r.unit(s.factory);
  }
}

const TankFactoryStateSchema = z.object({
  active: z.boolean(),
  initialized: z.boolean(),
  productionTicks: zInt(),
  waitingTankId: zInt().optional(),
  waitingTankTile: zTile().optional(),
  factory: zRef(),
});
type TankFactoryState = z.infer<typeof TankFactoryStateSchema>;
export const TankFactoryExecutionSnapshot = execSnapshotType({
  name: "TankFactory",
  version: 1,
  schema: TankFactoryStateSchema,
  cls: () => TankFactoryExecution,
});
