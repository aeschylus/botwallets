# Integrating botwallets with Lobster

Give a Lobster workflow the ability to hold and transact bitcoin using Cashu ecash. No wrapper code needed — botwallets ships a CLI that Lobster calls directly.

## Setup

```bash
npm install botwallets
npx botwallets init
```

`init` asks for your mint URL and DB path, tests the connection, and writes `botwallets.config.json`. All CLI commands read from this config automatically.

Verify it works:

```bash
npx botwallets cli balance
# {"balance":0}
```

## Generate the workflow files

```bash
npx botwallets generate lobster
```

This creates four workflow files:

- `send-ecash.lobster` — send ecash with approval gate
- `receive-ecash.lobster` — receive an ecash token
- `pay-invoice.lobster` — pay a Lightning invoice with approval gate
- `fund-wallet.lobster` — create a Lightning invoice to fund the wallet

## Workflows

### Send ecash

```yaml
name: send-ecash
steps:
  - id: check
    command: npx botwallets cli balance

  - id: approve
    command: echo "Send $AMOUNT sats to $RECEIVER?"
    approval: required

  - id: send
    command: npx botwallets cli send $AMOUNT --receiver $RECEIVER --note "$NOTE"
    condition: $approve.approved
```

```bash
lobster run send-ecash.lobster \
  --args-json '{"AMOUNT":"100","RECEIVER":"alice","NOTE":"weekly payout"}'
```

### Receive ecash

No approval needed — receiving is safe (the mint swaps the token for fresh proofs).

```yaml
name: receive-ecash
steps:
  - id: receive
    command: npx botwallets cli receive $TOKEN --sender $SENDER

  - id: confirm
    command: npx botwallets cli balance
```

### Pay a Lightning invoice

```yaml
name: pay-invoice
steps:
  - id: check
    command: npx botwallets cli balance

  - id: approve
    command: echo "Pay Lightning invoice?"
    approval: required

  - id: pay
    command: npx botwallets cli pay $INVOICE --note "$NOTE"
    condition: $approve.approved
```

### Fund the wallet

```yaml
name: fund-wallet
steps:
  - id: invoice
    command: npx botwallets cli mint $AMOUNT

  - id: wait
    command: echo "Pay the invoice above, then continue."
    approval: required

  - id: claim
    command: npx botwallets cli check $QUOTE_ID
```

## How it fits together

```
┌─────────────┐     ┌──────────┐     ┌──────────────────────┐     ┌──────┐
│  AI Agent   │────▶│ Lobster  │────▶│ npx botwallets cli   │────▶│ Mint │
│ (Clawdbot)  │     │ workflow │     │ (ships with package)  │     │      │
└─────────────┘     └──────────┘     └──────────────────────┘     └──────┘
   decides what       orchestrates      moves money               holds
   to pay             with gates                                  bitcoin
```

The agent decides intent ("pay the hosting invoice"), Lobster orchestrates with approval gates, and `npx botwallets cli` handles the money. No glue code to write.

## CLI reference

Every command outputs JSON for Lobster's `pick`, `where`, and `json` operators.

```bash
npx botwallets cli balance                    # {"balance": 500}
npx botwallets cli info                       # full wallet metadata
npx botwallets cli send 100 --receiver alice  # {"amount": 100, "token": "cashuA..."}
npx botwallets cli receive <token>            # {"received": 100, "balance": 600}
npx botwallets cli mint 1000                  # {"quoteId": "...", "invoice": "lnbc..."}
npx botwallets cli check <quoteId>            # {"minted": 1000} or {"minted": null}
npx botwallets cli pay <invoice>              # {"paid": true, "fee": 1}
npx botwallets cli history                    # array of transactions
```

Errors exit non-zero with `{"error": "...", "code": "INSUFFICIENT_BALANCE"}` — the workflow halts automatically.

## Multiple wallets

Use the `--wallet-id` flag to run separate wallets (e.g., one per purpose):

```bash
npx botwallets cli balance --wallet-id ops-wallet
npx botwallets cli send 100 --wallet-id payroll-wallet
```

All wallets share the same DB and mint connection.
