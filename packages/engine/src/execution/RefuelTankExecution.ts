import { TileRef } from "@openfront/engine-api/game/GameMap";
import {
  TANK_MAX_FUEL,
  TANK_REFUEL_PER_TICK,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import {
  zInt,
  zNum,
  zPlayerRef,
  zTile,
} from "@openfront/engine-lib/snapshot/SnapshotType";
import { z } from "zod";
import { Execution, Game, Player } from "../game/Game";
import { execSnapshotType } from "../snapshot/ExecutionSnapshot";
import type {
  ExecRecord,
  SnapshotReader,
  SnapshotWriter,
} from "../snapshot/SnapshotContext";

/** Moves selected tanks beside an owned oil mine and refuels them at a fixed rate. */
export class RefuelTankExecution implements Execution {
  private game!: Game;
  private active = true;
  private approachTiles = new Map<number, TileRef>();

  constructor(
    private owner: Player,
    private unitIds: number[],
    private oilMineId: number,
  ) {}

  init(game: Game): void {
    this.game = game;
    const mine = game.unit(this.oilMineId);
    if (
      !mine?.isActive() ||
      mine.type() !== UnitType.OilMine ||
      mine.owner() !== this.owner
    ) {
      this.active = false;
      return;
    }

    const tanks = new Map(
      this.owner.units(UnitType.Tank).map((tank) => [tank.id(), tank]),
    );
    const neighbors: TileRef[] = [];
    const count = game.neighbors4(mine.tile(), neighbors);
    for (const id of new Set(this.unitIds)) {
      const tank = tanks.get(id);
      if (!tank?.isActive() || (tank.fuel() ?? 0) >= TANK_MAX_FUEL) continue;

      let approach: TileRef | undefined;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let i = 0; i < count; i++) {
        const tile = neighbors[i];
        if (game.isWater(tile) || game.isImpassable(tile)) continue;
        const distance = game.manhattanDist(tank.tile(), tile);
        if (distance < bestDistance) {
          bestDistance = distance;
          approach = tile;
        }
      }
      if (approach === undefined) continue;

      this.approachTiles.set(id, approach);
      tank.setTargetTile(approach);
    }
    this.active = this.approachTiles.size > 0;
  }

  tick(): void {
    if (!this.active) return;
    const mine = this.game.unit(this.oilMineId);
    if (
      !mine?.isActive() ||
      mine.type() !== UnitType.OilMine ||
      mine.owner() !== this.owner
    ) {
      this.clearOrders();
      this.active = false;
      return;
    }

    for (const [id, approach] of this.approachTiles) {
      const tank = this.game.unit(id);
      if (!tank?.isActive() || tank.owner() !== this.owner) {
        this.approachTiles.delete(id);
        continue;
      }

      const fuel = tank.fuel() ?? 0;
      if (fuel >= TANK_MAX_FUEL) {
        if (tank.targetTile() === approach) tank.setTargetTile(undefined);
        this.approachTiles.delete(id);
        continue;
      }

      if (tank.targetTile() !== undefined && tank.targetTile() !== approach) {
        this.approachTiles.delete(id);
        continue;
      }

      const distance = this.game.manhattanDist(tank.tile(), mine.tile());
      if (distance > 1) {
        // A later move command replaces the approach tile and cancels refueling.
        if (tank.targetTile() !== approach) this.approachTiles.delete(id);
        continue;
      }

      tank.setTargetTile(undefined);
      tank.setFuel(Math.min(TANK_MAX_FUEL, fuel + TANK_REFUEL_PER_TICK));
      if ((tank.fuel() ?? 0) >= TANK_MAX_FUEL) {
        this.approachTiles.delete(id);
      }
    }

    this.active = this.approachTiles.size > 0;
  }

  private clearOrders(): void {
    for (const [id, approach] of this.approachTiles) {
      const tank = this.game.unit(id);
      if (tank?.targetTile() === approach) tank.setTargetTile(undefined);
    }
    this.approachTiles.clear();
  }

  isActive(): boolean {
    return this.active;
  }
  activeDuringSpawnPhase(): boolean {
    return false;
  }
  snapshot(w: SnapshotWriter): ExecRecord {
    return RefuelTankExecutionSnapshot.write({
      active: this.active,
      initialized: this.game !== undefined,
      owner: w.player(this.owner),
      unitIds: [...this.unitIds],
      oilMineId: this.oilMineId,
      approachTiles: [...this.approachTiles].map(([unitId, tile]) => ({
        unitId,
        tile,
      })),
    });
  }
  restoreSnapshot(s: RefuelTankState, r: SnapshotReader): void {
    this.active = s.active;
    if (s.initialized) this.game = r.game;
    this.owner = r.player(s.owner);
    this.unitIds = s.unitIds;
    this.oilMineId = s.oilMineId;
    this.approachTiles = new Map(
      s.approachTiles.map(({ unitId, tile }) => [unitId, tile]),
    );
  }
}

const RefuelTankStateSchema = z.object({
  active: z.boolean(),
  initialized: z.boolean(),
  owner: zPlayerRef(),
  unitIds: z.array(zNum()),
  oilMineId: zInt(),
  approachTiles: z.array(z.object({ unitId: zNum(), tile: zTile() })),
});
type RefuelTankState = z.infer<typeof RefuelTankStateSchema>;
export const RefuelTankExecutionSnapshot = execSnapshotType({
  name: "RefuelTank",
  version: 1,
  schema: RefuelTankStateSchema,
  cls: () => RefuelTankExecution,
});
