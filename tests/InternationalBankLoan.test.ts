import {
  ADMIN_CHEAT_STARTING_GOLD,
  PlayerType,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import { ConstructionExecution } from "@openfront/engine/execution/ConstructionExecution";
import { LoanApproveExecution } from "@openfront/engine/execution/LoanApproveExecution";
import { LoanRequestExecution } from "@openfront/engine/execution/LoanRequestExecution";
import { Game, Player } from "@openfront/engine/game/Game";
import { playerInfo, setup } from "./util/Setup";

describe("International Bank and Loan System", () => {
  let game: Game;
  let player1: Player;
  let player2: Player;

  beforeEach(async () => {
    game = await setup(
      "plains",
      {
        infiniteGold: false,
        instantBuild: true,
        infiniteTroops: false,
      },
      [
        playerInfo("player1", PlayerType.Human),
        playerInfo("player2", PlayerType.Human),
      ],
    );

    player1 = game.player("player1");
    player1.conquer(game.ref(0, 0));
    player1.conquer(game.ref(0, 1));
    player1.conquer(game.ref(0, 2));

    player2 = game.player("player2");
    player2.conquer(game.ref(5, 5));
  });

  function advanceTo10Minutes() {
    while (game.elapsedGameSeconds() < 600) {
      game.executeNextTick();
    }
  }

  test("Only the biggest player with >= 500M gold after 10 minutes can build International Bank for 250M", () => {
    player1.addGold(500_000_000n);
    player2.addGold(600_000_000n);

    // Before 10 minutes: cannot build
    expect(player1.canBuild(UnitType.InternationalBank, game.ref(0, 0))).toBe(
      false,
    );

    advanceTo10Minutes();

    // Player 2 has more gold, but fewer tiles than Player 1 -> cannot build
    expect(player2.canBuild(UnitType.InternationalBank, game.ref(5, 5))).toBe(
      false,
    );

    // Player 1 is the biggest player and has >= 500M gold -> can build
    expect(
      player1.canBuild(UnitType.InternationalBank, game.ref(0, 0)),
    ).not.toBe(false);

    const goldBefore = player1.gold();
    game.addExecution(
      new ConstructionExecution(
        player1,
        UnitType.InternationalBank,
        game.ref(0, 0),
      ),
    );
    game.executeNextTick();
    game.executeNextTick();

    expect(player1.gold()).toBe(goldBefore - 250_000_000n);
    expect(player1.units(UnitType.InternationalBank).length).toBe(1);
    expect(game.internationalBankOwner()).toBe(player1);
    expect(game.hasActiveInternationalBank(player1)).toBe(true);

    // Even if Player 2 conquers more tiles and has >= 500M gold, Player 2 can never build it
    for (let x = 1; x <= 6; x++) {
      player2.conquer(game.ref(x, 5));
    }
    expect(player2.numTilesOwned()).toBeGreaterThan(player1.numTilesOwned());
    expect(player2.canBuild(UnitType.InternationalBank, game.ref(5, 5))).toBe(
      false,
    );
  });

  test("Bank relocates if tile is captured while owner is alive, and is destroyed if owner dies", () => {
    player1.addGold(500_000_000n);
    advanceTo10Minutes();

    game.addExecution(
      new ConstructionExecution(
        player1,
        UnitType.InternationalBank,
        game.ref(0, 0),
      ),
    );
    game.executeNextTick();
    game.executeNextTick();

    expect(player1.units(UnitType.InternationalBank).length).toBe(1);

    // Enemy captures tile (0,0) while player1 still owns (0,1) and (0,2)
    player2.conquer(game.ref(0, 0));
    game.executeNextTick();

    // Bank is not captured by player2; it remains owned by player1 on another tile
    expect(player2.units(UnitType.InternationalBank).length).toBe(0);
    expect(player1.units(UnitType.InternationalBank).length).toBe(1);
    expect(game.hasActiveInternationalBank(player1)).toBe(true);

    // Now player2 conquers all remaining tiles of player1 (player1 dies)
    player2.conquer(game.ref(0, 1));
    player2.conquer(game.ref(0, 2));
    game.executeNextTick();

    expect(player1.isAlive()).toBe(false);
    expect(player1.units(UnitType.InternationalBank).length).toBe(0);
    expect(player2.units(UnitType.InternationalBank).length).toBe(0);
    expect(game.hasActiveInternationalBank(player1)).toBe(false);

    // Player 2 still cannot build the bank after player 1 dies
    player2.addGold(600_000_000n);
    expect(player2.canBuild(UnitType.InternationalBank, game.ref(5, 5))).toBe(
      false,
    );
  });

  test("Loan request, approval, automatic repayment, and negative gold balance when borrower lacks funds", () => {
    player1.addGold(600_000_000n);
    advanceTo10Minutes();

    game.addExecution(
      new ConstructionExecution(
        player1,
        UnitType.InternationalBank,
        game.ref(0, 0),
      ),
    );
    game.executeNextTick();
    game.executeNextTick();

    // Cannot grant loan before borrower requests it
    expect(player1.canGrantLoan(player2)).toBe(false);
    expect(player2.canRequestLoan(player1)).toBe(true);

    // Borrower sends loan request
    game.addExecution(new LoanRequestExecution(player2, player1.id()));
    game.executeNextTick();

    expect(game.hasPendingLoanRequest(player2, player1)).toBe(true);
    expect(player1.canGrantLoan(player2)).toBe(true);

    const lenderGoldBefore = player1.gold();
    const borrowerGoldBefore = player2.gold();
    const loanAmount = 50_000_000n;
    const durationSeconds = 5; // 50 ticks

    // Bank owner approves loan of 50M for 5 seconds
    game.addExecution(
      new LoanApproveExecution(
        player1,
        player2.id(),
        loanAmount,
        durationSeconds,
      ),
    );
    game.executeNextTick();

    expect(player1.gold()).toBe(lenderGoldBefore - loanAmount);
    expect(player2.gold()).toBe(borrowerGoldBefore + loanAmount);

    // Borrower spends almost all their gold so they only have 10M left when repayment is due
    player2.removeGold(player2.gold() - 10_000_000n);
    expect(player2.gold()).toBe(10_000_000n);

    // Advance 50 ticks (5 seconds) for automatic repayment
    for (let i = 0; i < 50; i++) {
      game.executeNextTick();
    }

    // Borrower's gold is automatically deducted by 50M, making their balance -40M!
    expect(player2.gold()).toBe(-40_000_000n);
    // Lender receives the full 50M back
    expect(player1.gold()).toBe(lenderGoldBefore);

    // Future income for borrower pays down the negative balance first
    player2.addGold(15_000_000n);
    expect(player2.gold()).toBe(-25_000_000n);
    player2.addGold(30_000_000n);
    expect(player2.gold()).toBe(5_000_000n);
  });

  test("Player named admin has infinite gold cheat and can build International Bank at second 0", async () => {
    const adminGame = await setup(
      "plains",
      {
        infiniteGold: false,
        instantBuild: true,
        infiniteTroops: false,
      },
      [
        playerInfo("admin", PlayerType.Human),
        playerInfo("other", PlayerType.Human),
      ],
    );

    const admin = adminGame.player("admin");
    const other = adminGame.player("other");

    // Other player owns MORE tiles than admin (3 vs 1)
    admin.conquer(adminGame.ref(0, 0));
    other.conquer(adminGame.ref(5, 5));
    other.conquer(adminGame.ref(5, 6));
    other.conquer(adminGame.ref(5, 7));

    // At elapsedGameSeconds() === 0:
    expect(adminGame.elapsedGameSeconds()).toBeLessThan(600);
    // Admin starts with ADMIN_CHEAT_STARTING_GOLD (999B)
    expect(admin.gold()).toBe(ADMIN_CHEAT_STARTING_GOLD);
    // Unit costs for admin are 0n
    expect(
      adminGame.unitInfo(UnitType.InternationalBank).cost(adminGame, admin),
    ).toBe(0n);
    expect(adminGame.unitInfo(UnitType.City).cost(adminGame, admin)).toBe(0n);

    // Admin can build International Bank right at second 0 even with fewer tiles
    expect(
      admin.canBuild(UnitType.InternationalBank, adminGame.ref(0, 0)),
    ).not.toBe(false);

    adminGame.addExecution(
      new ConstructionExecution(
        admin,
        UnitType.InternationalBank,
        adminGame.ref(0, 0),
      ),
    );
    adminGame.executeNextTick();
    adminGame.executeNextTick();

    expect(admin.units(UnitType.InternationalBank).length).toBe(1);
    expect(adminGame.hasActiveInternationalBank(admin)).toBe(true);

    // Other player requests a 100M loan from admin, and admin's gold does not decrease
    adminGame.addExecution(new LoanRequestExecution(other, admin.id()));
    adminGame.executeNextTick();

    const adminGoldBeforeLoan = admin.gold();
    adminGame.addExecution(
      new LoanApproveExecution(admin, other.id(), 100_000_000n, 10),
    );
    adminGame.executeNextTick();

    expect(other.gold()).toBeGreaterThanOrEqual(100_000_000n);
    expect(admin.gold()).toBeGreaterThanOrEqual(adminGoldBeforeLoan);
  });
});

