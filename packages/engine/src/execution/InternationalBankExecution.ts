import { zRef } from "@openfront/engine-lib/snapshot/SnapshotType";
import { z } from "zod";
import { Execution, Game, Unit } from "../game/Game";
import { execSnapshotType } from "../snapshot/ExecutionSnapshot";
import type {
  ExecRecord,
  SnapshotReader,
  SnapshotWriter,
} from "../snapshot/SnapshotContext";

export class InternationalBankExecution implements Execution {
  private mg: Game;
  private active: boolean = true;

  constructor(private bank: Unit) {}

  init(mg: Game, ticks: number): void {
    this.mg = mg;
  }

  tick(ticks: number): void {
    if (!this.bank.isActive()) {
      this.active = false;
      return;
    }

    const owner = this.bank.owner();
    if (!owner.isAlive() || this.mg.internationalBankOwner() !== owner) {
      this.bank.delete();
      this.active = false;
      return;
    }
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  snapshot(w: SnapshotWriter): ExecRecord {
    return InternationalBankExecutionSnapshot.write({
      active: this.active,
      initialized: this.mg !== undefined,
      bank: w.unit(this.bank),
    });
  }

  restoreSnapshot(s: InternationalBankState, r: SnapshotReader): void {
    this.active = s.active;
    if (s.initialized) this.mg = r.game;
    this.bank = r.unit(s.bank);
  }
}

const InternationalBankStateSchema = z.object({
  active: z.boolean(),
  initialized: z.boolean(),
  bank: zRef(),
});
type InternationalBankState = z.infer<typeof InternationalBankStateSchema>;

export const InternationalBankExecutionSnapshot = execSnapshotType({
  name: "InternationalBank",
  version: 1,
  schema: InternationalBankStateSchema,
  cls: () => InternationalBankExecution,
});
