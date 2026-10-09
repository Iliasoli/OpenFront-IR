import {
  PlayerInfo,
  PlayerType,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import { ConstructionExecution } from "@openfront/engine/execution/ConstructionExecution";
import { FactoryExecution } from "@openfront/engine/execution/FactoryExecution";
import { PlayerExecution } from "@openfront/engine/execution/PlayerExecution";
import { Game, Player } from "@openfront/engine/game/Game";
import { resourceProductionIncome } from "@openfront/engine/execution/utils/ResourceProduction";
import { setup } from "../util/Setup";
import { executeTicks } from "../util/utils";

describe("Mine economy", () => {
  let game: Game;
  let player: Player;

  const playerInfo = new PlayerInfo(
    "miner",
    PlayerType.Human,
    null,
    "miner_id",
  );

  beforeEach(async () => {
    game = await setup(
      "plains",
      {
        infiniteGold: false,
        instantBuild: true,
        infiniteTroops: true,
      },
      [playerInfo],
    );
    player = game.player(playerInfo.id);
    player.conquer(game.ref(0, 10));
    player.addGold(5_000_000n);
    game.addExecution(new PlayerExecution(player));
  });

  test("mines have distinct level-1 income rates", () => {
    expect(
      game.config().mineIncome(UnitType.OilMine, 1, player),
    ).toBe(10_000n);
    expect(
      game.config().mineIncome(UnitType.GoldMine, 1, player),
    ).toBe(15_000n);
    expect(
      game.config().mineIncome(UnitType.DiamondMine, 1, player),
    ).toBe(25_000n);
  });

  test("mine income scales with level", () => {
    expect(
      game.config().mineIncome(UnitType.OilMine, 3, player),
    ).toBe(30_000n);
    expect(
      game.config().mineIncome(UnitType.GoldMine, 2, player),
    ).toBe(30_000n);
    expect(
      game.config().mineIncome(UnitType.DiamondMine, 4, player),
    ).toBe(100_000n);
  });

  test("resource structures stop producing at their reserve cap", async () => {
    const resourceTile = game.ref(0, 10);
    const factoryTile = game.ref(0, 30);
    player.conquer(factoryTile);

    const factory = player.buildUnit(UnitType.Factory, factoryTile, {});
    game.addExecution(new FactoryExecution(factory));

    const oilCost = game.unitInfo(UnitType.OilMine).cost(game, player);
    player.addGold(oilCost);
    game.addExecution(
      new ConstructionExecution(player, UnitType.OilMine, resourceTile),
    );
    executeTicks(game, 8);

    const mine = player.units(UnitType.OilMine)[0];
    expect(mine).toBeDefined();

    executeTicks(game, 1300);

    expect(mine.resourceGoldProduced()).toBe(60_000n);

    const producedAtCap = mine.resourceGoldProduced();
    executeTicks(game, game.config().mineIncomeInterval() * 2);
    expect(mine.resourceGoldProduced()).toBe(producedAtCap);
  });

  test("a trade refill adds only 15 seconds of production", async () => {
    const target = game.ref(0, 10);
    const oilCost = game.unitInfo(UnitType.OilMine).cost(game, player);
    player.addGold(oilCost);

    game.addExecution(
      new ConstructionExecution(player, UnitType.OilMine, target),
    );
    game.executeNextTick();
    game.executeNextTick();

    const mine = player.units(UnitType.OilMine)[0];
    expect(mine).toBeDefined();

    mine.addResourceGoldProduced(60_000n);
    expect(mine.resourceGoldProduced()).toBe(60_000n);

    mine.refillResourceGoldProduced(
      game.config().resourceProductionTradeRefill(
        UnitType.OilMine,
        mine.level(),
        player,
      ),
    );
    expect(mine.resourceGoldProduced()).toBe(30_000n);
  });

  test("constructed mines generate income when rail-connected to demand", () => {
    const resourceTile = game.ref(0, 10);
    const factoryTile = game.ref(0, 30);
    player.conquer(factoryTile);

    const factory = player.buildUnit(UnitType.Factory, factoryTile, {});
    game.addExecution(new FactoryExecution(factory));

    const oilCost = game.unitInfo(UnitType.OilMine).cost(game, player);
    player.addGold(oilCost);
    game.addExecution(
      new ConstructionExecution(player, UnitType.OilMine, resourceTile),
    );
    executeTicks(game, 8);

    const mine = player.units(UnitType.OilMine)[0];
    expect(mine).toBeDefined();
    expect(mine.isUnderConstruction()).toBe(false);

    const station = game.railNetwork().stationManager().findStation(mine);
    expect(station).not.toBeNull();
    expect(station!.getCluster()).not.toBeNull();
    expect(
      [...station!.getCluster()!.stations].some(
        (s) => s.unit.type() === UnitType.Factory,
      ),
    ).toBe(true);

    const before = player.gold();
    for (let i = 0; i < game.config().mineIncomeInterval(); i++) {
      game.executeNextTick();
    }

    expect(player.gold() - before).toBeGreaterThanOrEqual(10_000n);
  });

  test("resource production is blocked without a rail-connected consumer", () => {
    const target = game.ref(0, 10);
    const oilCost = game.unitInfo(UnitType.OilMine).cost(game, player);
    player.addGold(oilCost);

    game.addExecution(
      new ConstructionExecution(player, UnitType.OilMine, target),
    );
    executeTicks(game, 8);

    const mine = player.units(UnitType.OilMine)[0];
    expect(mine).toBeDefined();

    executeTicks(game, game.config().mineIncomeInterval() * 2);
    expect(mine.resourceGoldProduced()).toBe(0n);
  });

  test("oversupply lowers mine income instead of creating unlimited passive gold", () => {
    const mine = player.buildUnit(UnitType.OilMine, game.ref(0, 10), {});
    const normal = game.config().mineIncome(UnitType.OilMine, 1, player);

    expect(
      resourceProductionIncome(
        mine,
        player,
        game,
        { supply: normal * 2n, demand: normal },
      ),
    ).toBe(normal / 2n);
  });
});
