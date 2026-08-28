# VeilCast Market Contract

`veilcast-market.compact` is the first Midnight contract for VeilCast.

It keeps each prediction position private through a commitment and a local witness.
The public ledger stores only market metadata, position commitments, an anonymous position count, the resolved outcome, and spent claim nullifiers.

The resolver must prove possession of the private resolver secret before locking or resolving a market.
The sports-data relayer is responsible for deciding when the configured deadline has passed until the project upgrades to a Compact toolchain that exposes block-time checks.

## Compile

```bash
npm run compile:check
```

The regular `compile` script also generates proving keys and requires the Compact toolchain to be available as `compact` on `PATH`.

This contract does not yet move wager tokens.
Token settlement will be added only after the private position and resolver circuits are integrated with the Midnight wallet flow.
