import {
  Gold,
  MessageType,
  Tick,
} from "@openfront/engine-api/game/GameTypes";
import { GameUpdateType } from "@openfront/engine-api/game/GameUpdates";
import { renderNumber } from "@openfront/engine-lib/Format";
import { zInt, zPlayerRef } from "@openfront/engine-lib/snapshot/SnapshotType";
import { z } from "zod";
import { Execution, Game, Player } from "../game/Game";
import { execSnapshotType } from "../snapshot/ExecutionSnapshot";
import type {
  ExecRecord,
  SnapshotReader,
  SnapshotWriter,
} from "../snapshot/SnapshotContext";

export class ActiveLoanExecution implements Execution {
  private mg: Game;
  private active: boolean = true;

  constructor(
    private lender: Player,
    private borrower: Player,
    private amount: Gold,
    private dueTick: Tick,
  ) {}

  init(mg: Game, ticks: number): void {
    this.mg = mg;
  }

  tick(ticks: number): void {
    if (!this.active) return;

    if (ticks >= this.dueTick) {
      // Automatically deduct full loan amount from borrower, even if it puts their balance negative
      this.borrower.deductGoldAllowNegative(this.amount);

      // Credit back to the bank owner if they are still alive
      if (this.lender.isAlive()) {
        this.lender.addGold(this.amount);
      }

      this.mg.addUpdate({
        type: GameUpdateType.LoanEvent,
        event: "repaid",
        lenderID: this.lender.smallID(),
        borrowerID: this.borrower.smallID(),
        amount: this.amount,
      });

      this.mg.displayMessage(
        "events_display.loan_repaid_borrower",
        MessageType.LOAN_REPAID,
        this.borrower.id(),
        this.amount,
        {
          gold: renderNumber(this.amount),
          name: this.lender.displayName(),
        },
        undefined,
        this.lender.id(),
      );

      if (this.lender.isAlive()) {
        this.mg.displayMessage(
          "events_display.loan_repaid_lender",
          MessageType.LOAN_REPAID,
          this.lender.id(),
          this.amount,
          {
            gold: renderNumber(this.amount),
            name: this.borrower.displayName(),
          },
          undefined,
          this.borrower.id(),
        );
      }

      this.active = false;
    }
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  snapshot(w: SnapshotWriter): ExecRecord {
    return ActiveLoanExecutionSnapshot.write({
      active: this.active,
      initialized: this.mg !== undefined,
      lender: w.player(this.lender),
      borrower: w.player(this.borrower),
      amount: this.amount,
      dueTick: this.dueTick,
    });
  }

  restoreSnapshot(s: ActiveLoanState, r: SnapshotReader): void {
    this.active = s.active;
    if (s.initialized) this.mg = r.game;
    this.lender = r.player(s.lender);
    this.borrower = r.player(s.borrower);
    this.amount = s.amount;
    this.dueTick = s.dueTick;
  }
}

const ActiveLoanStateSchema = z.object({
  active: z.boolean(),
  initialized: z.boolean(),
  lender: zPlayerRef(),
  borrower: zPlayerRef(),
  amount: z.bigint(),
  dueTick: zInt(),
});
type ActiveLoanState = z.infer<typeof ActiveLoanStateSchema>;

export const ActiveLoanExecutionSnapshot = execSnapshotType({
  name: "ActiveLoan",
  version: 1,
  schema: ActiveLoanStateSchema,
  cls: () => ActiveLoanExecution,
});
