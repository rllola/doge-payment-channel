# Payment channel diagram

Alice is a client that wants to open a payment channel with Bob, a merchant.

```
  [ Alice ]                             [ Bob ]
      |                                    |
      |--- [1] Request channel ----------->|
      |<--------- [2] Return public key ---|
     _|_                                   |
    | | |                                  |
    |[A]| Create channel p2sh              |
    | | |                                  |
    |[B]| Fund channel (on-chain)          |
    | | |                                  |
    |[C]| Create a PSBT and store it       |
    |_|_|                                  |
      |                                    |
      |--- [3] Announce PSBT ------------->|
      |                                   _|_
      |                                  | | |
      |                                  |[D]| Validate & store PSBT
      |                                  |_|_|
      |<-- [4] Accept or reject channel ---|
      |                                    |
      ******** CHANNEL  ESTABLISHED ********
      |                                    |
      |--- Order item 1 ------------------>|
      |<-------------- [5] Send invoice ---|
     _|_                                   |
    | | |                                  |
    |[E]| Create output for amount 1       |
    | | |                                  |
    |[F]| Sign and store transaction       |
    |_|_|                                  |
      |--- [6] Send PSBT ----------------->|
      |                                   _|_
      |                                  | | |
      |                                  |[G]| Validate & store PSBT
      |                                  |_|_|
      |<---------------  Fulfill item 1 ---|
      |                                    |
      ********     ORDER 1 DONE     ********
      |                                    |
      |--- Order item 2 ------------------>|
      |<-------------- [5] Send invoice ---|
     _|_                                   |
    | | |                                  |
    |[E]| Create output for amount 1 + 2   |
    | | |                                  |
    |[F]| Sign and store transaction       |
    |_|_|                                  |
      |--- [6] Send PSBT ----------------->|
      |                                   _|_
      |                                  | | |
      |                                  |[G]| Validate & store PSBT
      |                                  |_|_|
      |<---------------  Fulfill item 2 ---|
      |                                    |
      ********     ORDER 2 DONE     ********
      |                                   _|_
      |                                  | | |
      |                                  |[H]| Sign and broadcast on-chain
      |                                  |_|_|
      |                                    |
      ********    CHANNEL CLOSED    ********
```

### Communications

- 1. Requesting a payment channel can be as simple as a GET request, that
- 2. Returns a unique public key that Bob can sign with
- 3. Announce a PSBT message with funding inputs, no outputs and no signatures.
     Each input contains a redeemscript and the full serialized funding
     transaction that created the input.
- 4. Bob accepts or rejects the channel announcement. If accepted, this means
     that Alice can now use the locked funds to do purchases from Bob.
- 5. Send an invoice to Alice specifying (at least) the amount to pay and the
     address to pay to.
- 6. Send a PSBT to Bob that contains funding inputs, outputs reflecting the
     latest amount that Bob is owed, and signatures from Alice.

### Operations

- A. Create a P2SH address with a `OP_CHECKLOCKTIMEVERIFY` spending back to
     Alice, and a 2-of-2 `OP_CHECKMULTISIG` clause.
- B. Fund the P2SH address with some DOGE
- C. Create a PSBT message with only inputs, redeemscript and the funding
     transaction(s).
- D. Validate the PSBT to contain our public key, sufficient amount and
     allow sufficient locktime
- E. Create or amend outputs to match payment and add these to the PSBT from _C_
- F. Sign the transaction and store it
- G. Validate the PSBT to contain our public key, pays the correct amount and
     still allows sufficient locktime. Validate the signature. Store the PSBT.
- H. Close the channel by signing and broadcasting the last valid PSBT to the
     Dogecoin network. Once the signed transaction is mined, the channel is
     closed.
