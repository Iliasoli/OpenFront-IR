import {
  MessageType,
  PlayerID,
} from "@openfront/engine-api/game/GameTypes";
import { zPlayerRef } from "@openfront/engine-lib/snapshot/SnapshotType";
import { z } from "zod";
import { Execution, Game, Player } from "../game/Game";
import { execSnapshotType } from "../snapshot/ExecutionSnapshot";
import type {
  ExecRecord,
  SnapshotReader,
  SnapshotWriter,
} from "../snapshot/SnapshotContext";

export class LoanRejectExecution implements Execution {
  private active = true;

  constructor(
    private requestorID: PlayerID,
    private recipient: Player,
  ) {}

  init(mg: Game, ticks: number): void {
    if (!mg.hasPlayer(this.requestorID)) {
      console.warn(
        `[LoanRejectExecution] Requestor ${this.requestorID} not found`,
      );
      this.active = false;
      return;
    }

    const requestor = mg.player(this.requestorID);
    if (mg.hasPendingLoanRequest(requestor, this.recipient)) {
      mg.rejectLoanRequest(requestor, this.recipient);
      mg.displayMessage(
        "events_display.loan_rejected",
        MessageType.LOAN_REJECTED,
        requestor.id(),
        undefined,
        {
          name: this.recipient.displayName(),
        },
        undefined,
        this.recipient.id(),
      );
    }

    this.active = false;
  }

  tick(ticks: number): void {}

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  snapshot(w: SnapshotWriter): ExecRecord {
    return LoanRejectExecutionSnapshot.write({
      active: this.active,
      requestorID: this.requestorID,
      recipient: w.player(this.recipient),
    });
  }

  restoreSnapshot(s: LoanRejectState, r: SnapshotReader): void {
    this.active = s.active;
    this.requestorID = s.requestorID;
    this.recipient = r.player(s.recipient);
  }
}

const LoanRejectStateSchema = z.object({
  active: z.boolean(),
  requestorID: z.string(),
  recipient: zPlayerRef(),
});
type LoanRejectState = z.infer<typeof LoanRejectStateSchema>;

export const LoanRejectExecutionSnapshot = execSnapshotType({
  name: "LoanReject",
  version: 1,
  schema: LoanRejectStateSchema,
  cls: () => LoanRejectExecution,
});
