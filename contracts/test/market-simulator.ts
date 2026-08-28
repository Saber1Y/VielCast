import { createHash } from "node:crypto";

export type Outcome = "UNRESOLVED" | "YES" | "NO";
export type PrivatePosition = { side: "YES" | "NO"; stake: bigint; salt: string };

export function commitment(position: PrivatePosition): string {
  return createHash("sha256")
    .update(`${position.side}:${position.stake.toString()}:${position.salt}`)
    .digest("hex");
}

export class MarketSimulator {
  private locked = false;
  private outcome: Outcome = "UNRESOLVED";
  private readonly commitments = new Set<string>();
  private readonly nullifiers = new Set<string>();

  constructor(private readonly resolverSecret: string) {}

  submitPosition(publicCommitment: string, position: PrivatePosition): void {
    if (this.locked) throw new Error("Market is locked");
    if (this.commitments.has(publicCommitment)) throw new Error("Position commitment already submitted");
    if (commitment(position) !== publicCommitment) throw new Error("Position commitment does not match private position");
    this.commitments.add(publicCommitment);
  }

  lock(secret: string): void {
    if (this.locked) throw new Error("Market is already locked");
    if (secret !== this.resolverSecret) throw new Error("Resolver authorization failed");
    this.locked = true;
  }

  resolve(secret: string, outcome: Exclude<Outcome, "UNRESOLVED">): void {
    if (!this.locked) throw new Error("Market must be locked before resolution");
    if (this.outcome !== "UNRESOLVED") throw new Error("Market is already resolved");
    if (secret !== this.resolverSecret) throw new Error("Resolver authorization failed");
    this.outcome = outcome;
  }

  claim(publicCommitment: string, nullifier: string, position: PrivatePosition): void {
    if (this.outcome === "UNRESOLVED") throw new Error("Market is not resolved");
    if (!this.commitments.has(publicCommitment)) throw new Error("Unknown position commitment");
    if (this.nullifiers.has(nullifier)) throw new Error("Position was already claimed");
    if (commitment(position) !== publicCommitment) throw new Error("Position commitment does not match private position");
    if ((position.side === "YES" ? "YES" : "NO") !== this.outcome) throw new Error("Position did not win");
    this.nullifiers.add(nullifier);
  }

  publicSnapshot(): { locked: boolean; outcome: Outcome; positionCount: number } {
    return { locked: this.locked, outcome: this.outcome, positionCount: this.commitments.size };
  }
}
