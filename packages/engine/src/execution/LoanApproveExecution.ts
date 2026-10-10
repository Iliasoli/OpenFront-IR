import {
  Gold,
  MessageType,
  PlayerID,
  Tick,
} from "@openfront/engine-api/game/GameTypes";
import { GameUpdateType } from "@openfront/engine-api/game/GameUpdates";
import { renderNumber } from "@openfront/engine-lib/Format";
import {
  zInt,
  zNum,
  zPlayerRef,
} from "@openfront/engine-lib/snapshot/SnapshotType";
import { toInt } from "@openfront/engine-lib/Util";
import { z } from "zod";
import { Execution, Game, Player } from "../game/Game";
import { execSnapshotType } from "../snapshot/ExecutionSnapshot";
import type {
  ExecRecord,
  SnapshotReader,
  SnapshotWriter,
} from "../snapshot/SnapshotContext";
import { ActiveLoanExecution } from "./ActiveLoanExecution";

export class LoanApproveExecution implements Execution {
  private active = true;
  private mg: Game;
  private pendingBorrower: Player | null = null;
  private pendingAmount: Gold = 0n;
  private pendingDueTick: Tick = 0;

  constructor(
    private lender: Player,
    private borrowerID: PlayerID,
    private goldNum: number | bigint,
    private durationSeconds: number,
  ) {}

  init(mg: Game, ticks: number): void {
    this.mg = mg;
    if (!mg.hasPlayer(this.borrowerID)) {
      console.warn(
        `[LoanApproveExecution] Borrower ${this.borrowerID} not found`,
      );
      this.active = false;
      return;
    }

    const borrower = mg.player(this.borrowerID);
    if (!this.lender.canGrantLoan(borrower)) {
      console.warn("[LoanApproveExecution] Cannot grant loan");
      this.active = false;
      return;
    }

    const requestedAmount =
      typeof this.goldNum === "bigint" ? this.goldNum : toInt(this.goldNum);
    if (requestedAmount <= 0n) {
      this.active = false;
      return;
    }

    const actualLoan = this.lender.removeGold(requestedAmount);
    if (actualLoan <= 0n) {
      this.active = false;
      return;
    }

    mg.consumeLoanRequest(borrower, this.lender);
    borrower.addGold(actualLoan);

    const durationSecs = Math.max(
      5,
      Math.min(3600, Math.floor(this.durationSeconds)),
    );
    const dueTick = ticks + durationSecs * 10;

    this.pendingBorrower = borrower;
    this.pendingAmount = actualLoan;
    this.pendingDueTick = dueTick;

    mg.addUpdate({
      type: GameUpdateType.LoanEvent,
      event: "granted",
      lenderID: this.lender.smallID(),
      borrowerID: borrower.smallID(),
      amount: actualLoan,
      durationSeconds: durationSecs,
    });

    mg.displayMessage(
      "events_display.loan_received",
      MessageType.LOAN_ACCEPTED,
      borrower.id(),
      actualLoan,
      {
        gold: renderNumber(actualLoan),
        name: this.lender.displayName(),
        seconds: durationSecs,
      },
      undefined,
      this.lender.id(),
    );

    mg.displayMessage(
      "events_display.loan_granted",
      MessageType.LOAN_ACCEPTED,
      this.lender.id(),
      actualLoan,
      {
        gold: renderNumber(actualLoan),
        name: borrower.displayName(),
        seconds: durationSecs,
      },
      undefined,
      borrower.id(),
    );
  }

  tick(ticks: number): void {
    if (this.pendingBorrower !== null && this.pendingAmount > 0n) {
      this.mg.addExecution(
        new ActiveLoanExecution(
          this.lender,
          this.pendingBorrower,
          this.pendingAmount,
          this.pendingDueTick,
        ),
      );
      this.pendingBorrower = null;
    }
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  snapshot(w: SnapshotWriter): ExecRecord {
    return LoanApproveExecutionSnapshot.write({
      active: this.active,
      initialized: this.mg !== undefined,
      lender: w.player(this.lender),
      borrowerID: this.borrowerID,
      goldNum: Number(this.goldNum),
      durationSeconds: this.durationSeconds,
      pendingBorrower: this.pendingBorrower
        ? w.player(this.pendingBorrower)
        : null,
      pendingAmount: this.pendingAmount,
      pendingDueTick: this.pendingDueTick,
    });
  }

  restoreSnapshot(s: LoanApproveState, r: SnapshotReader): void {
    this.active = s.active;
    if (s.initialized) this.mg = r.game;
    this.lender = r.player(s.lender);
    this.borrowerID = s.borrowerID;
    this.goldNum = s.goldNum;
    this.durationSeconds = s.durationSeconds;
    this.pendingBorrower =
      s.pendingBorrower !== null ? r.player(s.pendingBorrower) : null;
    this.pendingAmount = s.pendingAmount;
    this.pendingDueTick = s.pendingDueTick;
  }
}

const LoanApproveStateSchema = z.object({
  active: z.boolean(),
  initialized: z.boolean(),
  lender: zPlayerRef(),
  borrowerID: z.string(),
  goldNum: zNum(),
  durationSeconds: zInt(),
  pendingBorrower: zPlayerRef().nullable(),
  pendingAmount: z.bigint(),
  pendingDueTick: zInt(),
});
type LoanApproveState = z.infer<typeof LoanApproveStateSchema>;

export const LoanApproveExecutionSnapshot = execSnapshotType({
  name: "LoanApprove",
  version: 1,
  schema: LoanApproveStateSchema,
  cls: () => LoanApproveExecution,
});
