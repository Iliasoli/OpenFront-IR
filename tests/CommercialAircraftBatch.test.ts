import { Game, Player, PlayerInfo, PlayerType, UnitType } from "../src/core/game/Game";
import { setup } from "./util/Setup";
import { executeTicks } from "./util/utils";

let game: Game;
let player: Player;

// This batch is intentionally small and contract-focused. It should become
// the regression suite for the commercial-aircraft unit once the unit is
// wired into the game model on feature/aircraft.
describe("Commercial aircraft", () => {
  beforeEach(async () => {
    game = await setup(
      "plains",
      { infiniteGold: true, instantBuild: true },
      [new PlayerInfo("airline", PlayerType.Human, null, "airline")],
    );
    player = game.player("airline");
  });

  test("commercial aircraft is a distinct buildable unit type", () => {
    expect(UnitType).toHaveProperty("PassengerPlane");
  });

  test("commercial aircraft has unit configuration", () => {
    const passengerPlane = (UnitType as Record<string, UnitType>)[
      "PassengerPlane"
    ];

    expect(passengerPlane).toBeDefined();
    expect(() => game.config().unitInfo(passengerPlane)).not.toThrow();
    expect(game.config().unitInfo(passengerPlane).cost(game, player)).toBeGreaterThan(0n);
  });

  test("commercial aircraft can be constructed through the normal unit API", () => {
    const passengerPlane = (UnitType as Record<string, UnitType>)[
      "PassengerPlane"
    ];
    const tile = game.ref(50, 50);

    expect(() => player.buildUnit(passengerPlane, tile, {})).not.toThrow();

    const aircraft = game.units().find(
      (unit) => unit.type() === passengerPlane,
    );
    expect(aircraft).toBeDefined();
    expect(aircraft?.owner()).toBe(player);
  });

  test("commercial aircraft survives the normal game tick cycle", () => {
    const passengerPlane = (UnitType as Record<string, UnitType>)[
      "PassengerPlane"
    ];
    const aircraft = player.buildUnit(passengerPlane, game.ref(50, 50), {});
    const startingTile = aircraft.tile();

    executeTicks(game, 20);

    expect(aircraft.isActive()).toBe(true);
    expect(aircraft.owner()).toBe(player);
    expect(aircraft.tile()).toBe(startingTile);
  });
});
