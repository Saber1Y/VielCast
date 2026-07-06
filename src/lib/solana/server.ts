import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";
import { PREDICTION_MARKET_IDL } from "./idl";
import { PROGRAM_ID, DEVNET_RPC, participantPda } from "./constants";

let _sdk: PredictionMarketServerSDK | null = null;

export class PredictionMarketServerSDK {
  program: any;
  connection: Connection;
  adminWallet: PublicKey;

  constructor(keypair: Keypair) {
    this.connection = new Connection(DEVNET_RPC, "confirmed");
    const wallet = {
      publicKey: keypair.publicKey,
      signTransaction: (tx: any) => {
        tx.partialSign(keypair);
        return tx;
      },
      signAllTransactions: (txs: any[]) => {
        txs.forEach((tx) => tx.partialSign(keypair));
        return txs;
      },
    };
    const provider = new AnchorProvider(this.connection, wallet as any, {
      commitment: "confirmed",
    });
    this.program = new Program(PREDICTION_MARKET_IDL, provider);
    this.adminWallet = keypair.publicKey;
  }

  private toEnum(name: string): object {
    const key = name
      .toLowerCase()
      .split("_")
      .map((s, i) => i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1))
      .join("");
    return { [key]: {} };
  }

  async initializeMarket(fixtureId: number, marketType: string, threshold: number) {
    const [market] = this.marketPda(fixtureId);
    return this.program.methods
      .initializeMarket({
        fixtureId: new BN(fixtureId),
        marketType: this.toEnum(marketType),
        threshold: new BN(threshold),
      })
      .accounts({
        creator: this.adminWallet,
        market,
        systemProgram: PublicKey.default,
      })
      .rpc();
  }

  async lockMarket(fixtureId: number) {
    const [market] = this.marketPda(fixtureId);
    return this.program.methods
      .lockMarket()
      .accounts({ creator: this.adminWallet, market })
      .rpc();
  }

  async settleMarket(fixtureId: number, winnerSide: string, merkleRoot: number[]) {
    const [market] = this.marketPda(fixtureId);
    return this.program.methods
      .settleMarket({
        winnerSide: this.toEnum(winnerSide),
        merkleRoot,
      })
      .accounts({ creator: this.adminWallet, market })
      .rpc();
  }

  async buildJoinTransaction(
    fixtureId: number,
    participantWallet: PublicKey,
    side: string,
    amount: number,
  ): Promise<Transaction> {
    const [market] = this.marketPda(fixtureId);
    const [participant] = participantPda(PROGRAM_ID, market, participantWallet);

    const ix = this.program.instruction.joinMarket(
      { side: this.toEnum(side), amount: new BN(amount) },
      { accounts: { participantWallet, market, participant, systemProgram: SystemProgram.programId } },
    );

    const tx = new Transaction().add(ix);
    tx.feePayer = participantWallet;
    const { blockhash } = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    return tx;
  }

  async buildClaimTransaction(
    fixtureId: number,
    claimerWallet: PublicKey,
  ): Promise<Transaction> {
    const [market] = this.marketPda(fixtureId);
    const [participant] = participantPda(PROGRAM_ID, market, claimerWallet);

    const ix = this.program.instruction.claimPayout(
      { accounts: { claimer: claimerWallet, market, participant, systemProgram: SystemProgram.programId } },
    );

    const tx = new Transaction().add(ix);
    tx.feePayer = claimerWallet;
    const { blockhash } = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    return tx;
  }

  async fetchMarket(fixtureId: number) {
    const [pda] = this.marketPda(fixtureId);
    return this.program.account.market.fetch(pda);
  }

  marketPda(fixtureId: number): [PublicKey, number] {
    const buf = new Uint8Array(8);
    new DataView(buf.buffer).setBigUint64(0, BigInt(fixtureId), true);
    return PublicKey.findProgramAddressSync(
      [Buffer.from("market"), this.adminWallet.toBuffer(), Buffer.from(buf)],
      PROGRAM_ID
    );
  }
}

export function getServerSDK(): PredictionMarketServerSDK {
  if (_sdk) return _sdk;
  _sdk = new PredictionMarketServerSDK(loadAdminKeypair());
  return _sdk;
}

function loadAdminKeypair(): Keypair {
  if (process.env.ADMIN_KEYPAIR_SECRET) {
    const decoded = Buffer.from(process.env.ADMIN_KEYPAIR_SECRET, "base64");
    return Keypair.fromSecretKey(decoded);
  }
  const keypairPath = process.env.ADMIN_KEYPAIR_PATH
    ? path.resolve(process.env.ADMIN_KEYPAIR_PATH)
    : path.resolve("solana/admin-keypair.json");
  const secret = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  return Keypair.fromSecretKey(Buffer.from(secret));
}
