import { Gold, UnitType } from "@openfront/engine-api/game/GameTypes";
import { Game, Player, Unit } from "../../game/Game";
import { Cluster } from "../../game/TrainStation";

export const RESOURCE_PRODUCTION_UNIT_TYPES = [
  UnitType.OilMine,
  UnitType.GoldMine,
  UnitType.DiamondMine,
  UnitType.LivestockFarm,
] as const;

export const RESOURCE_PRODUCTION_CONSUMER_UNIT_TYPES = [
  UnitType.City,
  UnitType.MissileSilo,
  UnitType.Factory,
  UnitType.Port,
] as const;

export interface ResourceProductionMarket {
  supply: Gold;
  demand: Gold;
}

/**
 * Build a local resource market for each connected rail cluster.
 *
 * Supply comes only from the player's resource structures. Demand comes only
 * from the player's Cities, Missile Silos, Factories, and Ports. A structure
 * that is not in a rail cluster with at least one of those consumers has no
 * valid market and therefore cannot produce.
 */
export function resourceProductionMarkets(
  player: Player,
  game: Game,
): Map<Cluster, ResourceProductionMarket> {
  const markets = new Map<Cluster, ResourceProductionMarket>();
  const stationManager = game.railNetwork().stationManager();

  const addToMarket = (
    unit: Unit,
    amount: Gold,
    field: "supply" | "demand",
  ): void => {
    if (
      !unit.isActive() ||
      unit.isUnderConstruction() ||
      unit.isMarkedForDeletion()
    ) {
      return;
    }

    const station = stationManager.findStation(unit);
    const cluster = station?.getCluster();
    if (cluster === null || cluster === undefined) {
      return;
    }

    let market = markets.get(cluster);
    if (market === undefined) {
      market = { supply: 0n, demand: 0n };
      markets.set(cluster, market);
    }
    market[field] += amount;
  };

  for (const unit of player.units(RESOURCE_PRODUCTION_UNIT_TYPES)) {
    addToMarket(
      unit,
      game.config().mineIncome(unit.type(), unit.level(), player),
      "supply",
    );
  }

  for (const unit of player.units(
    RESOURCE_PRODUCTION_CONSUMER_UNIT_TYPES,
  )) {
    addToMarket(
      unit,
      game.config().resourceProductionConsumerDemand(unit.level()),
      "demand",
    );
  }

  return markets;
}

/**
 * Resolve the market-adjusted gold for one resource producer.
 *
 * The market is the second valve after the bounded trade-throughput reserve:
 * - no connected consumer demand => 0
 * - supply <= demand => 100% of normal income
 * - supply > demand => income falls in proportion to demand/supply
 * - an extreme glut bottoms out at the configured price floor
 */
export function resourceProductionIncome(
  unit: Unit,
  player: Player,
  game: Game,
  market: ResourceProductionMarket | undefined,
): Gold {
  if (
    market === undefined ||
    market.demand <= 0n ||
    market.supply <= 0n
  ) {
    return 0n;
  }

  const normalIncome = game.config().mineIncome(
    unit.type(),
    unit.level(),
    player,
  );
  if (normalIncome <= 0n) return 0n;

  if (market.supply <= market.demand) {
    return normalIncome;
  }

  const floorBps = Math.max(
    0,
    Math.min(10_000, game.config().resourceProductionPriceFloorBps()),
  );
  const marketBps = Number(
    (market.demand * 10_000n) / market.supply,
  );
  const realizedBps = Math.max(floorBps, Math.min(10_000, marketBps));

  return (normalIncome * BigInt(realizedBps)) / 10_000n;
}
