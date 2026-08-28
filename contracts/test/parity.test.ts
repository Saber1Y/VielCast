import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Contract } from "../managed/veilcast-market/contract/index.js";
import { createWitnesses, positionCommitment, resolverCommitment } from "../src/witnesses.js";

describe("commitment helpers vs compiled contract", () => {
  const salt = new Uint8Array(32).fill(0xab);
  const contract = new Contract(createWitnesses());

  it("reproduces the deployed contract position commitment byte-for-byte", () => {
    const position: [boolean, bigint, Uint8Array] = [true, 5n, salt];
    const fromContract = contract._persistentCommit_0(position, position[2]);
    assert.deepEqual(positionCommitment({ side: position[0], stake: position[1], salt: position[2] }), fromContract);
  });

  it("reproduces the deployed contract resolver hash byte-for-byte", () => {
    const fromContract = contract._persistentHash_0(salt);
    assert.deepEqual(resolverCommitment(salt), fromContract);
  });
});