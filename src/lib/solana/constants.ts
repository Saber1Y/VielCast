import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "D254EggCVsZ7jKtJJ29diEv3P4qqjn5APBAvcRwDNsyE"
);

export const DEVNET_RPC = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

export function marketPda(
  programId: PublicKey,
  creator: PublicKey,
  fixtureId: number
): [PublicKey, number] {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigUint64(0, BigInt(fixtureId), true);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), creator.toBuffer(), Buffer.from(buf)],
    programId
  );
}

export function participantPda(
  programId: PublicKey,
  market: PublicKey,
  wallet: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("participant"), market.toBuffer(), wallet.toBuffer()],
    programId
  );
}
