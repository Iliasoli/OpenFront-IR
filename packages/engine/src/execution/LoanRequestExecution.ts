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

export class LoanRequestExecution implements Execution {
  private active = true;

  constructor(
    private requestor: Player,
    private recipientID: PlayerID,
  ) {}

  init(mg: Game, ticks: number): void {
    if (!mg.hasPlayer(this.recipientID)) {
      console.warn(
        `[LoanRequestExecution] Recipient ${this.recipientID} not found`,
      );
      this.active = false;
      return;
    }

    const recipient = mg.player(this.recipientID);
    if (!this.requestor.canRequestLoan(recipient)) {
      console.warn("[LoanRequestExecution] Cannot request loan");
      this.active = false;
      return;
    }

    if (mg.createLoanRequest(this.requestor, recipient)) {
      mg.displayMessage(
        "events_display.loan_request_sent",
        MessageType.LOAN_REQUEST,
        this.requestor.id(),
        undefined,
        {
          name: recipient.displayName(),
        },
        undefined,
        recipient.id(),
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
    return LoanRequestExecutionSnapshot.write({
      active: this.active,
      requestor: w.player(this.requestor),
      recipientID: this.recipientID,
    });
  }

  restoreSnapshot(s: LoanRequestState, r: SnapshotReader): void {
    this.active = s.active;
    this.requestor = r.player(s.requestor);
    this.recipientID = s.recipientID;
  }
}

const LoanRequestStateSchema = z.object({
  active: z.boolean(),
  requestor: zPlayerRef(),
  recipientID: z.string(),
});
type LoanRequestState = z.infer<typeof LoanRequestStateSchema>;

export const LoanRequestExecutionSnapshot = execSnapshotType({
  name: "LoanRequest",
  version: 1,
  schema: LoanRequestStateSchema,
  cls: () => LoanRequestExecution,
});
