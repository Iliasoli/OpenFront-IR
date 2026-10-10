import { TileRef } from "@openfront/engine-api/game/GameMap";
import {
  Relation,
  TANK_MAX_FUEL,
  UnitType,
} from "@openfront/engine-api/game/GameTypes";
import { PseudoRandom } from "@openfront/engine-lib/PseudoRandom";
import { randTerritoryTileArray } from "../nation/NationUtils";
import { ConstructionExecution } from "../ConstructionExecution";
import { LoanApproveExecution } from "../LoanApproveExecution";
import { LoanRejectExecution } from "../LoanRejectExecution";
import { LoanRequestExecution } from "../LoanRequestExecution";
import { MoveTankExecution } from "../MoveTankExecution";
import { RefuelTankExecution } from "../RefuelTankExecution";
import { Game, Player, Unit } from "../../game/Game";

export const AI_RESOURCE_STRUCTURE_TYPES = [
  UnitType.LivestockFarm,
  UnitType.OilMine,
  UnitType.GoldMine,
  UnitType.DiamondMine,
] as const;

export const AI_PROTECTED_STRUCTURE_TYPES = [
  ...AI_RESOURCE_STRUCTURE_TYPES,
  UnitType.TankFactory,
  UnitType.InternationalBank,
] as const;

const RESOURCE_TILE_SAMPLES = 32;
const RAIL_PLACEMENT_RADIUS = 3;
const LOAN_REQUEST_COOLDOWN_TICKS = 300; // 30 seconds

/**
 * Lets non-human AI players build and upgrade the resource structures that
 * humans can build, as well as use the International Bank, Loans, Tank
 * Factories, and Tanks:
 *
 * - builds the International Bank when eligible;
 * - approves or rejects incoming loan requests when owning the International Bank;
 * - requests loans from the International Bank owner when gold is low;
 * - upgrades existing resource structures when the upgrade is the best use of
 *   available gold;
 * - prefers Oil Mines close to friendly factories;
 * - prefers all resource mines close to existing railroads;
 * - builds Tank Factories near Gold/Oil Mines and commands/refuels Tanks.
 */
export class AiResourceStructureBehavior {
  private lastLoanRequestTick = -1;

  constructor(
    private random: PseudoRandom,
    private game: Game,
    private player: Player,
  ) {}

  /**
   * Executes strategic AI actions (International Bank construction, loan
   * approvals/rejections, loan requests, and tank orders/refueling).
   * Designed to be zero-RNG when no action is eligible so existing snapshots
   * and deterministic seeds are unaffected.
   */
  handleStrategicActions(): boolean {
    if (!this.player.isAlive() || this.player.numTilesOwned() === 0) {
      return false;
    }

    let acted = false;
    if (this.handleIncomingLoanRequests()) {
      acted = true;
    }
    if (this.maybeBuildInternationalBank()) {
      acted = true;
    }
    if (this.maybeRequestLoan()) {
      acted = true;
    }
    if (this.handleTanks()) {
      acted = true;
    }
    return acted;
  }

  maybeBuildInternationalBank(): boolean {
    if (
      this.game.config().isUnitDisabled(UnitType.InternationalBank) ||
      this.game.internationalBankOwner() !== null ||
      this.game.units(UnitType.InternationalBank).length > 0 ||
      this.game.elapsedGameSeconds() < 600 ||
      this.player.gold() < 500_000_000n ||
      !this.game.isBiggestPlayer(this.player)
    ) {
      return false;
    }

    const candidates = randTerritoryTileArray(
      this.random,
      this.game,
      this.player,
      RESOURCE_TILE_SAMPLES,
    );

    for (const tile of candidates) {
      const spawnTile = this.player.canBuild(UnitType.InternationalBank, tile);
      if (spawnTile !== false) {
        this.game.addExecution(
          new ConstructionExecution(
            this.player,
            UnitType.InternationalBank,
            spawnTile,
          ),
        );
        return true;
      }
    }

    for (const tile of this.player.borderTiles()) {
      const spawnTile = this.player.canBuild(UnitType.InternationalBank, tile);
      if (spawnTile !== false) {
        this.game.addExecution(
          new ConstructionExecution(
            this.player,
            UnitType.InternationalBank,
            spawnTile,
          ),
        );
        return true;
      }
    }

    return false;
  }

  handleIncomingLoanRequests(): boolean {
    if (!this.game.hasActiveInternationalBank(this.player)) {
      return false;
    }

    let handled = false;
    for (const other of this.game.players()) {
      if (other === this.player || !other.isAlive()) continue;
      if (!this.game.hasPendingLoanRequest(other, this.player)) continue;

      const isFriendly =
        this.player.isFriendly(other) ||
        this.player.relation(other) >= Relation.Friendly;
      const isHostile =
        !isFriendly &&
        (this.player.hasEmbargoAgainst(other) ||
          other.hasEmbargoAgainst(this.player) ||
          this.player.relation(other) <= Relation.Hostile);

      if (
        isHostile ||
        !this.player.canGrantLoan(other) ||
        this.player.gold() < 2_000_000n
      ) {
        this.game.addExecution(
          new LoanRejectExecution(other.id(), this.player),
        );
        handled = true;
        continue;
      }

      const rawShare = isFriendly
        ? this.player.gold() / 4n
        : this.player.gold() / 8n;
      const maxLoan = isFriendly ? 200_000_000n : 100_000_000n;
      let loanAmount = rawShare > maxLoan ? maxLoan : rawShare;
      if (loanAmount < 1_000_000n) {
        loanAmount = 1_000_000n;
      }
      const durationSeconds = isFriendly ? 120 : 90;

      this.game.addExecution(
        new LoanApproveExecution(
          this.player,
          other.id(),
          loanAmount,
          durationSeconds,
        ),
      );
      handled = true;
    }

    return handled;
  }

  maybeRequestLoan(): boolean {
    const bankOwner = this.game.internationalBankOwner();
    if (
      bankOwner === null ||
      bankOwner === this.player ||
      !bankOwner.isAlive() ||
      !this.player.canRequestLoan(bankOwner)
    ) {
      return false;
    }

    if (
      this.player.hasEmbargoAgainst(bankOwner) ||
      bankOwner.hasEmbargoAgainst(this.player) ||
      (!this.player.isFriendly(bankOwner) &&
        this.player.relation(bankOwner) <= Relation.Hostile)
    ) {
      return false;
    }

    const now = this.game.ticks();
    if (
      this.lastLoanRequestTick >= 0 &&
      now - this.lastLoanRequestTick < LOAN_REQUEST_COOLDOWN_TICKS
    ) {
      return false;
    }

    if (bankOwner.gold() < 2_000_000n) {
      return false;
    }

    const cityCost = this.game
      .unitInfo(UnitType.City)
      .cost(this.game, this.player);
    const needThreshold = cityCost > 5_000_000n ? cityCost : 5_000_000n;
    if (this.player.gold() >= needThreshold) {
      return false;
    }

    this.lastLoanRequestTick = now;
    this.game.addExecution(
      new LoanRequestExecution(this.player, bankOwner.id()),
    );
    return true;
  }

  handleTanks(): boolean {
    const tanks = this.player
      .units(UnitType.Tank)
      .filter((tank) => tank.isActive());
    if (tanks.length === 0) {
      return false;
    }

    let acted = false;
    const oilMines = this.player
      .units(UnitType.OilMine)
      .filter(
        (mine) =>
          mine.isActive() &&
          !mine.isUnderConstruction() &&
          !mine.isMarkedForDeletion(),
      );

    const lowFuelThreshold = Math.floor(TANK_MAX_FUEL * 0.25);
    const readyTanks: Unit[] = [];

    for (const tank of tanks) {
      const fuel = tank.fuel() ?? 0;
      if (fuel <= lowFuelThreshold && oilMines.length > 0) {
        let nearestMine = oilMines[0];
        let bestDist = this.game
          .map()
          .manhattanDist(tank.tile(), nearestMine.tile());
        for (let i = 1; i < oilMines.length; i++) {
          const d = this.game
            .map()
            .manhattanDist(tank.tile(), oilMines[i].tile());
          if (d < bestDist) {
            bestDist = d;
            nearestMine = oilMines[i];
          }
        }
        if (bestDist > 1) {
          this.game.addExecution(
            new RefuelTankExecution(
              this.player,
              [tank.id()],
              nearestMine.id(),
            ),
          );
          acted = true;
        }
      } else if (fuel > lowFuelThreshold) {
        const target = tank.targetTile();
        if (
          target === undefined ||
          target === tank.tile() ||
          this.game.owner(target) === this.player
        ) {
          readyTanks.push(tank);
        }
      }
    }

    if (readyTanks.length > 0) {
      const targetTile = this.findEnemyTankTarget(readyTanks[0].tile());
      if (targetTile !== null) {
        this.game.addExecution(
          new MoveTankExecution(
            this.player,
            readyTanks.map((t) => t.id()),
            targetTile,
          ),
        );
        acted = true;
      }
    }

    return acted;
  }

  private findEnemyTankTarget(fromTile: TileRef): TileRef | null {
    let bestTile: TileRef | null = null;
    let bestDist = Infinity;

    for (const neighbor of this.player.neighbors()) {
      if (!neighbor.isPlayer() || this.player.isFriendly(neighbor)) continue;

      const enemyUnits = neighbor
        .units()
        .filter((u) => u.isActive() && !this.game.isWater(u.tile()));
      for (const u of enemyUnits) {
        const d = this.game.map().manhattanDist(fromTile, u.tile());
        if (d < bestDist) {
          bestDist = d;
          bestTile = u.tile();
        }
      }

      if (bestTile === null) {
        for (const borderTile of neighbor.borderTiles()) {
          if (
            this.game.isWater(borderTile) ||
            this.game.isImpassable(borderTile)
          ) {
            continue;
          }
          const d = this.game.map().manhattanDist(fromTile, borderTile);
          if (d < bestDist) {
            bestDist = d;
            bestTile = borderTile;
          }
        }
      }
    }

    return bestTile;
  }

  handleStructures(): boolean {
    if (this.maybeBuildInternationalBank()) {
      return true;
    }
    if (!this.game.config().aiResourceStructures()) {
      return false;
    }
    if (!this.player.isAlive() || this.player.numTilesOwned() === 0) {
      return false;
    }

    const bestUpgrade = this.findBestUpgrade();
    const bestBuild = this.findBestBuild();

    if (
      bestUpgrade !== null &&
      (bestBuild === null || bestUpgrade.score >= bestBuild.score)
    ) {
      this.player.upgradeUnit(bestUpgrade.unit);
      return true;
    }

    if (bestBuild !== null) {
      this.game.addExecution(
        new ConstructionExecution(
          this.player,
          bestBuild.type,
          bestBuild.tile,
        ),
      );
      return true;
    }

    return false;
  }

  private findBestUpgrade(): { unit: Unit; score: number } | null {
    let best: { unit: Unit; score: number } | null = null;

    for (const type of AI_RESOURCE_STRUCTURE_TYPES) {
      if (this.game.config().isUnitDisabled(type)) continue;

      const income = Number(
        this.game.config().mineIncome(type, 1, this.player),
      );
      const farmBonus = type === UnitType.LivestockFarm ? 1.1 : 1;
      const countPenalty =
        1 / (1 + Math.max(0, this.player.unitsOwned(type)));

      for (const unit of this.player.units(type)) {
        if (
          !unit.isActive() ||
          unit.isUnderConstruction() ||
          unit.isMarkedForDeletion()
        ) {
          continue;
        }
        if (!this.player.canUpgradeUnit(unit)) continue;

        const cost = Number(
          this.game.unitInfo(type).cost(this.game, this.player),
        );
        if (this.player.gold() < BigInt(Math.ceil(cost))) continue;

        // Keep building missing resource types competitive with upgrades while
        // still letting profitable upgrades happen when the AI already has
        // coverage of the resource types it can use.
        const score =
          (income / Math.max(1, cost)) *
          countPenalty *
          farmBonus *
          0.9;

        if (best === null || score > best.score) {
          best = { unit, score };
        }
      }
    }

    return best;
  }

  private canConsiderTankFactory(): boolean {
    if (this.game.config().isUnitDisabled(UnitType.TankFactory)) {
      return false;
    }
    const activeGoldMines = this.player
      .units(UnitType.GoldMine)
      .filter(
        (m) =>
          m.isActive() && !m.isUnderConstruction() && !m.isMarkedForDeletion(),
      ).length;
    if (activeGoldMines === 0) {
      return false;
    }
    for (const type of AI_RESOURCE_STRUCTURE_TYPES) {
      if (this.game.config().isUnitDisabled(type)) continue;
      if (this.player.unitsOwned(type) === 0) {
        return false;
      }
    }
    return (
      this.player.unitsOwned(UnitType.TankFactory) <
      Math.min(2, activeGoldMines)
    );
  }

  private findBestBuild(): {
    type: UnitType;
    tile: TileRef;
    score: number;
  } | null {
    let best: {
      type: UnitType;
      tile: TileRef;
      score: number;
    } | null = null;

    const buildTypes: UnitType[] = [...AI_RESOURCE_STRUCTURE_TYPES];
    if (this.canConsiderTankFactory()) {
      buildTypes.push(UnitType.TankFactory);
    }

    for (const type of buildTypes) {
      if (this.game.config().isUnitDisabled(type)) continue;

      const cost = this.game.unitInfo(type).cost(this.game, this.player);
      if (this.player.gold() < cost) continue;

      const candidates = randTerritoryTileArray(
        this.random,
        this.game,
        this.player,
        RESOURCE_TILE_SAMPLES,
      );

      for (const tile of candidates) {
        const spawnTile = this.player.canBuild(type, tile);
        if (spawnTile === false) continue;

        const score =
          this.structureScore(type) * this.placementScore(type, spawnTile);

        if (best === null || score > best.score) {
          best = {
            type,
            tile: spawnTile,
            score,
          };
        }
      }
    }

    return best;
  }

  private structureScore(type: UnitType): number {
    const cost = Number(this.game.unitInfo(type).cost(this.game, this.player));
    if (type === UnitType.TankFactory) {
      const goldIncome = Number(
        this.game.config().mineIncome(UnitType.GoldMine, 1, this.player),
      );
      const count = this.player.unitsOwned(type);
      const countPenalty = 1 / (1 + count);
      const missingBonus = count === 0 ? 1.5 : 0.75;
      return (goldIncome / Math.max(1, cost)) * countPenalty * missingBonus;
    }

    const income = Number(
      this.game.config().mineIncome(type, 1, this.player),
    );
    const count = this.player.unitsOwned(type);
    const countPenalty = 1 / (1 + count);
    const missingTypeBonus = count === 0 ? 2 : 1;
    const farmBonus = type === UnitType.LivestockFarm ? 1.1 : 1;

    return (
      (income / Math.max(1, cost)) *
      countPenalty *
      missingTypeBonus *
      farmBonus
    );
  }

  private placementScore(type: UnitType, tile: TileRef): number {
    let score = 1;

    if (
      type === UnitType.OilMine ||
      type === UnitType.GoldMine ||
      type === UnitType.DiamondMine
    ) {
      score *= this.railroadPlacementScore(type, tile);
    }

    if (type === UnitType.OilMine) {
      score *= this.oilFactoryPlacementScore(tile);
    }

    if (type === UnitType.TankFactory) {
      score *= this.tankFactoryPlacementScore(tile);
    }

    return score;
  }

  private tankFactoryPlacementScore(tile: TileRef): number {
    const maxRange = Math.max(1, this.game.config().trainStationMaxRange());
    const goldMines = this.player
      .units(UnitType.GoldMine)
      .filter(
        (m) =>
          m.isActive() && !m.isUnderConstruction() && !m.isMarkedForDeletion(),
      );
    if (goldMines.length === 0) {
      return 0.1;
    }

    let nearestGoldDist = Infinity;
    for (const mine of goldMines) {
      nearestGoldDist = Math.min(
        nearestGoldDist,
        this.game.map().manhattanDist(tile, mine.tile()),
      );
    }
    if (nearestGoldDist > maxRange) {
      return 0.1;
    }

    const goldCloseness = (maxRange - nearestGoldDist + 1) / maxRange;
    let bonus = 1 + goldCloseness * 2;

    const oilMines = this.player
      .units(UnitType.OilMine)
      .filter(
        (m) =>
          m.isActive() && !m.isUnderConstruction() && !m.isMarkedForDeletion(),
      );
    for (const oil of oilMines) {
      const d = this.game.map().manhattanDist(tile, oil.tile());
      if (d <= maxRange) {
        bonus += 0.5;
      }
    }

    return bonus;
  }

  private oilFactoryPlacementScore(tile: TileRef): number {
    const factories = this.player
      .units(UnitType.Factory)
      .filter(
        (factory) =>
          factory.isActive() &&
          !factory.isUnderConstruction() &&
          !factory.isMarkedForDeletion(),
      );

    if (factories.length === 0) {
      return 0.85;
    }

    const maxRange = Math.max(1, this.game.config().trainStationMaxRange());
    let nearestDistance = Infinity;

    for (const factory of factories) {
      nearestDistance = Math.min(
        nearestDistance,
        this.game.map().manhattanDist(tile, factory.tile()),
      );
    }

    if (nearestDistance > maxRange) {
      return 0.9;
    }

    const closeness = (maxRange - nearestDistance + 1) / maxRange;
    return 1 + closeness * 3;
  }

  private railroadPlacementScore(type: UnitType, tile: TileRef): number {
    const railTiles = this.game
      .railNetwork()
      .overlappingRailroads(type, tile);

    if (railTiles.length === 0) {
      return 1;
    }

    let nearestDistance = RAIL_PLACEMENT_RADIUS + 1;
    for (const railTile of railTiles) {
      nearestDistance = Math.min(
        nearestDistance,
        this.game.map().manhattanDist(tile, railTile),
      );
    }

    if (nearestDistance > RAIL_PLACEMENT_RADIUS) {
      return 1;
    }

    const closeness =
      (RAIL_PLACEMENT_RADIUS - nearestDistance + 1) /
      (RAIL_PLACEMENT_RADIUS + 1);
    return 1 + closeness * 1.5;
  }
}
