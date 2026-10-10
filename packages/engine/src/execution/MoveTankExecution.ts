import { TileRef } from "@openfront/engine-api/game/GameMap";
import { UnitType } from "@openfront/engine-api/game/GameTypes";
import { zNum, zPlayerRef } from "@openfront/engine-lib/snapshot/SnapshotType";
import { z } from "zod";
import { Execution, Game, Player } from "../game/Game";
import { execSnapshotType } from "../snapshot/ExecutionSnapshot";
import type {
  ExecRecord,
  SnapshotReader,
  SnapshotWriter,
} from "../snapshot/SnapshotContext";

export class MoveTankExecution implements Execution {
  constructor(
    private owner: Player,
    private unitIds: number[],
    private position: TileRef,
  ) {}
  init(game: Game): void {
    if (
      !game.isValidRef(this.position) ||
      game.isWater(this.position) ||
      game.isImpassable(this.position)
    )
      return;
    const units = new Map(
      this.owner.units(UnitType.Tank).map((unit) => [unit.id(), unit]),
    );
    for (const id of new Set(this.unitIds)) {
      const tank = units.get(id);
      if (tank?.isActive()) tank.setTargetTile(this.position);
    }
  }
  tick(): void {}
  isActive(): boolean {
    return false;
  }
  activeDuringSpawnPhase(): boolean {
    return false;
  }
  snapshot(w: SnapshotWriter): ExecRecord {
    return MoveTankExecutionSnapshot.write({
      owner: w.player(this.owner),
      unitIds: [...this.unitIds],
      position: this.position,
    });
  }
  restoreSnapshot(s: MoveTankState, r: SnapshotReader): void {
    this.owner = r.player(s.owner);
    this.unitIds = s.unitIds;
    this.position = s.position;
  }
}

const MoveTankStateSchema = z.object({
  owner: zPlayerRef(),
  unitIds: z.array(zNum()),
  position: zNum(),
});
type MoveTankState = z.infer<typeof MoveTankStateSchema>;
export const MoveTankExecutionSnapshot = execSnapshotType({
  name: "MoveTank",
  version: 1,
  schema: MoveTankStateSchema,
  cls: () => MoveTankExecution,
});
