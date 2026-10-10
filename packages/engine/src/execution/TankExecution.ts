import {
  TANK_ASSAULT_MIN_POWER,
  TANK_ASSAULT_TROOP_RATE,
  TANK_FUEL_PER_SHOT,
  TANK_FUEL_PER_TILE,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import { zInt, zRef } from "@openfront/engine-lib/snapshot/SnapshotType";
import { z } from "zod";
import { Execution, Game, Unit } from "../game/Game";
import { execSnapshotType } from "../snapshot/ExecutionSnapshot";
import type {
  ExecRecord,
  SnapshotReader,
  SnapshotWriter,
} from "../snapshot/SnapshotContext";
import { AttackExecution } from "./AttackExecution";
import { FlatBinaryHeap } from "./utils/FlatBinaryHeap";

const TANK_ASSAULT_STRENGTH = 250_000;

export class TankExecution implements Execution {
  private game!: Game;
  private active = true;
  private combatCooldown = 0;
  private assaultedPlayers = new Set<number>();
  private unreachableTarget: number | undefined;
  private unreachableWaterVersion = -1;
  private unreachableRetryTick = 0;

  constructor(private tank: Unit) {}
  init(game: Game): void {
    this.game = game;
  }

  tick(): void {
    if (!this.tank.isActive()) {
      this.active = false;
      return;
    }
    const target = this.tank.targetTile();
    this.assaultEnemyTile(this.tank.tile());
    if ((this.tank.fuel() ?? 0) < TANK_FUEL_PER_SHOT) return;
    const enemies = this.game
      .nearbyUnits(this.tank.tile(), 2, UnitType.Tank)
      .filter(
        ({ unit }) =>
          unit.owner() !== this.tank.owner() &&
          !unit.owner().isFriendly(this.tank.owner()),
      );
    if (enemies.length > 0) {
      if (++this.combatCooldown >= 5) {
        this.combatCooldown = 0;
        const enemy = enemies[0].unit;
        enemy.modifyHealth(-100, this.tank.owner());
        if (this.tank.isActive()) this.tank.modifyHealth(-60, enemy.owner());
        if (this.tank.isActive()) {
          this.tank.setFuel((this.tank.fuel() ?? 0) - TANK_FUEL_PER_SHOT);
        }
      }
      return;
    }
    if (target === undefined || target === this.tank.tile()) return;
    if ((this.tank.fuel() ?? 0) < TANK_FUEL_PER_TILE) return;
    const waterVersion = this.game.map().waterVersion();
    if (
      this.unreachableTarget === target &&
      this.unreachableWaterVersion === waterVersion &&
      this.game.ticks() < this.unreachableRetryTick
    ) {
      return;
    }
    const start = this.tank.tile();
    const open = new FlatBinaryHeap();
    open.enqueue(start, this.game.manhattanDist(start, target));
    const previous = new Map<number, number>();
    const distance = new Map<number, number>([[start, 0]]);
    const closed = new Set<number>();
    let found = false;
    while (open.size() > 0 && !found) {
      const tile = open.dequeue();
      if (closed.has(tile)) continue;
      closed.add(tile);
      if (tile === target) {
        found = true;
        break;
      }
      const nextDistance = distance.get(tile)! + 1;
      const neighbors: number[] = [];
      const count = this.game.neighbors4(tile, neighbors);
      for (let n = 0; n < count; n++) {
        const next = neighbors[n];
        if (
          closed.has(next) ||
          this.game.isWater(next) ||
          this.game.isImpassable(next)
        )
          continue;
        const knownDistance = distance.get(next);
        if (knownDistance !== undefined && knownDistance <= nextDistance) {
          continue;
        }
        distance.set(next, nextDistance);
        previous.set(next, tile);
        // Manhattan distance is an admissible heuristic for four-way tank
        // movement. The tiny tie-breaker favors nodes nearer the goal when
        // routes have equal length, avoiding the old fixed 5,000-tile cutoff.
        const remaining = this.game.manhattanDist(next, target);
        open.enqueue(next, nextDistance + remaining + remaining * 0.001);
      }
    }
    if (!found) {
      // Unreachable destinations can otherwise flood a large map search on
      // every tick. Retry periodically, or immediately when the order or the
      // map's water connectivity changes.
      this.unreachableTarget = target;
      this.unreachableWaterVersion = waterVersion;
      this.unreachableRetryTick = this.game.ticks() + 20;
      return;
    }
    this.unreachableTarget = undefined;
    this.unreachableRetryTick = 0;
    let step = target;
    while (previous.get(step) !== start) {
      const parent = previous.get(step);
      if (parent === undefined) return;
      step = parent;
    }
    this.tank.move(step);
    this.tank.setFuel((this.tank.fuel() ?? 0) - TANK_FUEL_PER_TILE);
    this.assaultEnemyTile(step);
  }

  private assaultEnemyTile(tile: number): void {
    const owner = this.game.owner(tile);
    const attacker = this.tank.owner();
    if (
      !owner.isPlayer() ||
      owner === attacker ||
      attacker.isFriendly(owner) ||
      !attacker.canAttack(tile) ||
      this.assaultedPlayers.has(owner.smallID())
    )
      return;

    this.assaultedPlayers.add(owner.smallID());
    this.game.addExecution(
      new AttackExecution(
        Math.max(
          TANK_ASSAULT_MIN_POWER,
          Math.floor(attacker.troops() * TANK_ASSAULT_TROOP_RATE),
        ),
        attacker,
        owner.id(),
        null,
        false,
      ),
    );
  }

  isActive(): boolean {
    return this.active;
  }
  activeDuringSpawnPhase(): boolean {
    return false;
  }
  snapshot(w: SnapshotWriter): ExecRecord {
    return TankExecutionSnapshot.write({
      active: this.active,
      initialized: this.game !== undefined,
      combatCooldown: this.combatCooldown,
      assaultedPlayers: [...this.assaultedPlayers],
      tank: w.unit(this.tank),
    });
  }
  restoreSnapshot(s: TankState, r: SnapshotReader): void {
    this.active = s.active;
    this.combatCooldown = s.combatCooldown;
    this.assaultedPlayers = new Set(s.assaultedPlayers);
    if (s.initialized) this.game = r.game;
    this.tank = r.unit(s.tank);
  }
}

const TankStateSchema = z.object({
  active: z.boolean(),
  initialized: z.boolean(),
  combatCooldown: z.number().int().min(0),
  assaultedPlayers: z.array(zInt()),
  tank: zRef(),
});
type TankState = z.infer<typeof TankStateSchema>;
export const TankExecutionSnapshot = execSnapshotType({
  name: "Tank",
  version: 1,
  schema: TankStateSchema,
  cls: () => TankExecution,
});
