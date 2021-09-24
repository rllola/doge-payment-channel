# Payment channel diagram

Alice is a client who want to open a payment channel with Bob the merchant.


  [ Alice ]                             [ Bob ]
      |                                    |
      |--- Initiate PC ------------------->|
      |<---------------- Return pubkey ----|
      |                                    |
      |                                    |
**Serialize                                |
    & broadcast multisig**        **Identify multisig on the chain and the locktime**
      |                                    |
      |----- send partially sign tx1       |
      |          to buy object 1 --------->|  /!/ Don't broacast yet (but can sign it)
      |<---------------------- Success! ---|
    //////                                 |
    Offline                                |
    //////                                 |
      |                                    |
      |---- send partially sign tx2        |
      |           to buy object 2 -------->|
      |<---------------------- Success! ---|
      |                                    |
      |                             **Sign tx2 and brocast it**

                PC now closed

PC: "Payment Channel"
pubkey: "Public key"
