import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  positionCommitment,
  resolverCommitment,
  type PrivatePosition,
} from "../src/witnesses.js";

const saltA = new Uint8Array(32).fill(0x11);
const saltB = new Uint8Array(32).fill(0x22);

const yesPosition: PrivatePosition = { side: true, stake: 10n, salt: saltA };
const noPosition: PrivatePosition = { side: false, stake: 25n, salt: saltB };

describe("VeilCast position commitment helpers", () => {
  it("produces a deterministic 32-byte commitment for a private position", () => {
    const a = positionCommitment(yesPosition);
    const b = positionCommitment(yesPosition);
    assert.equal(a.length, 32);
    assert.deepEqual(a, b);
  });

  it("binds the side, stake, and salt so different positions never collide", () => {
    const commitments = new Set(
      [
        yesPosition,
        { side: !yesPosition.side, stake: yesPosition.stake, salt: yesPosition.salt },
        { side: yesPosition.side, stake: yesPosition.stake + 1n, salt: yesPosition.salt },
        { side: yesPosition.side, stake: yesPosition.stake, salt: saltB },
        noPosition,
      ].map(positionCommitment),
    );
    assert.equal(commitments.size, 5);
  });

  it("hashes the resolver secret to a separate 32-byte value", () => {
    const digest = resolverCommitment(saltA);
    assert.equal(digest.length, 32);
    assert.notDeepEqual(digest, saltA);
    assert.notDeepEqual(digest, positionCommitment(yesPosition));
    assert.deepEqual(resolverCommitment(saltA), resolverCommitment(saltA));
  });
});