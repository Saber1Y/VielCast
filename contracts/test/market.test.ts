import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { commitment, MarketSimulator, type PrivatePosition } from "./market-simulator.js";

const yesPosition: PrivatePosition = { side: "YES", stake: 10n, salt: "yes-salt" };
const noPosition: PrivatePosition = { side: "NO", stake: 25n, salt: "no-salt" };

describe("VeilCast market contract model", () => {
  it("accepts valid private commitments without exposing position data", () => {
    const market = new MarketSimulator("resolver-secret");
    market.submitPosition(commitment(yesPosition), yesPosition);
    market.submitPosition(commitment(noPosition), noPosition);

    assert.deepEqual(market.publicSnapshot(), {
      locked: false,
      outcome: "UNRESOLVED",
      positionCount: 2,
    });
  });

  it("rejects a commitment that does not match the private position", () => {
    const market = new MarketSimulator("resolver-secret");
    assert.throws(
      () => market.submitPosition(commitment(yesPosition), noPosition),
      /does not match/,
    );
  });

  it("requires resolver authorization to lock and resolve", () => {
    const market = new MarketSimulator("resolver-secret");
    assert.throws(() => market.lock("wrong-secret"), /authorization/);
    market.lock("resolver-secret");
    assert.throws(() => market.resolve("wrong-secret", "YES"), /authorization/);
  });

  it("rejects new positions after locking", () => {
    const market = new MarketSimulator("resolver-secret");
    market.lock("resolver-secret");
    assert.throws(() => market.submitPosition(commitment(yesPosition), yesPosition), /locked/);
  });

  it("allows only the winning private position to claim once", () => {
    const market = new MarketSimulator("resolver-secret");
    market.submitPosition(commitment(yesPosition), yesPosition);
    market.submitPosition(commitment(noPosition), noPosition);
    market.lock("resolver-secret");
    market.resolve("resolver-secret", "YES");

    market.claim(commitment(yesPosition), "yes-nullifier", yesPosition);
    assert.throws(
      () => market.claim(commitment(yesPosition), "yes-nullifier", yesPosition),
      /already been claimed/,
    );
    assert.throws(
      () => market.claim(commitment(noPosition), "no-nullifier", noPosition),
      /did not win/,
    );
  });
});
