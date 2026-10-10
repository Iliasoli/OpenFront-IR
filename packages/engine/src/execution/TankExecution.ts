import { UnitType } from "@openfront/engine-api/game/GameTypes";
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

const TANK_ASSAULT_STRENGTH = 250_000;

export class TankExecution implements Execution {
  private game!: Game;
  private active = true;
  private combatCooldown = 0;
  private assaultedPlayers = new Set<number>();

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
      }
      return;
    }
    this.assaultEnemyTile(this.tank.tile());
    if (target === undefined || target === this.tank.tile()) return;
    const open: number[] = [this.tank.tile()];
    const previous = new Map<number, number>();
    const seen = new Set<number>(open);
    let found = false;
    for (let i = 0; i < open.length && i < 5000 && !found; i++) {
      const tile = open[i];
      const neighbors: number[] = [];
      const count = this.game.neighbors4(tile, neighbors);
      for (let n = 0; n < count; n++) {
        const next = neighbors[n];
        if (
          seen.has(next) ||
          this.game.isWater(next) ||
          this.game.isImpassable(next)
        )
          continue;
        seen.add(next);
        previous.set(next, tile);
        open.push(next);
        if (next === target) {
          found = true;
          break;
        }
      }
    }
    if (!found) return;
    let step = target;
    while (previous.get(step) !== this.tank.tile()) {
      const parent = previous.get(step);
      if (parent === undefined) return;
      step = parent;
    }
    this.tank.move(step);
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
        TANK_ASSAULT_STRENGTH,
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
