# How to create a payment channel

Quick guide to show how to create a payment channel using (Dogecoin SPV wallet)[https://github.com/rllola/dogecoin-spv-node/tree/feature/payment-channel]

Docker would be required.

```bash
$ git clone git@github.com:rllola/dogecoin-spv-node.git
$ cd dogecoin-spv-node
$ git checkout feature/payment-channel
$ make build-regtest
$ make regtest
```

In a new terminal (1), we are entering our docker container to be able to use Dogecoin CLI.
```bash
$ docker exec -ti dogecoind_regtest bash
$ dogecoin-cli generate 150
```

In a new terminal (2), we are starting our Dogecoin wallet in regtest mode.
```bash
$ npm install
$ DEV=true NETWORK=regtest npm start
```

In a new terminal (optional), we can follow the logs.
```bash
$ tail -f stdout.log
```

In terminal 2, we can see our wallet screen
```bash
================ SPV node ============================

    Height headers: 471/471
    Hash: 1b9268d87f05caeb34607574922a1a143ce8b31abac21a13dccded6c28a52f59
    Peers: 1
    Tips: ["1b9268d87f05caeb34607574922a1a143ce8b31abac21a13dccded6c28a52f59"]
    Merkle Height: 471/471

================ Wallet =============================

    Balance: 0 Ð                 

================ Payment Channels ===================
                                                     
    NONE                        
                                                     
================ Menu ===============================
                                                     
    1. Generate a new address                        
    2. Send dogecoins                                
    3. Create payment channel                        
    4. Make a payment on payment channel
                                                     
    0. Quit            
```

You need to generate a new address by pressing 1. Copy it (CTRL+SHIFT+C). You will have a different address.

```bash
================ NEW ADDRESS DOGECOIN ================

  Your address :
  mue1wCBbSfAtXbRQ7bxCxWCnLoq1AfqgS4

  Press "Return" to return to main screen

```

In terminal 1, we will send some doge to our address.
```bash
$ dogecoin-cli sendtoaddress mue1wCBbSfAtXbRQ7bxCxWCnLoq1AfqgS4 150
$ dogecoin-cli generate 50
```

In terminal 2, press return to go back to the main menu. You might need to Quit the app and relaunch it. You can stop the wallet by pressing 0. (Regtest generate block to fast and the sync sometimes fails... recent bug).

Your balance should show 150D.
```bash
================ SPV node ============================

    Height headers: 521/521
    Hash: d861459328a04923b5f763918447806f17624ab1f83a12961d46b8688aa5a924
    Peers: 1
    Tips: ["d861459328a04923b5f763918447806f17624ab1f83a12961d46b8688aa5a924"]
    Merkle Height: 521/521

================ Wallet =============================

    Balance: 150 Ð                 

================ Payment Channels ===================
                                                     
    NONE                        
                                                     
================ Menu ===============================
                                                     
    1. Generate a new address                        
    2. Send dogecoins                                
    3. Create payment channel                        
    4. Make a payment on payment channel
                                                     
    0. Quit 
```

Now we can "Create payment channel" by pressing 3.

```bash
================ PAYMENT CHANNEL ================

  Press "Enter" to create a payment channel with http://127.0.0.1:5000  

  Press "Return" to return to main screen
```

And then press Enter to valid.

```bash
================ PAYMENT CHANNEL ================

  P2SH address : 2MvUqM2tFEurgFL82GvbDL7Z4HFJDLYVCRV                    

  Press "Return" to return to main screen
```

In terminal 1, generate some block.
```bash
$ dogecoin-cli generate 10
```

In terminal 2, press Return to go back to the main menu. You payment channel should have appeared.
```bash

================ SPV node ============================

    Height headers: 531/531
    Hash: 1df353f86c31fc249fdc09796fa639e6c4aae13f32c526c382af488c6e75294c
    Peers: 1
    Tips: ["1df353f86c31fc249fdc09796fa639e6c4aae13f32c526c382af488c6e75294c"]
    Merkle Height: 531/531

================ Wallet =============================

    Balance: 49 Ð                 

================ Payment Channels ===================
                                                     
    2MvUqM2tFEurgFL82GvbDL7Z4HFJDLYVCRV ---> 100 Ð                  
                                                                 
                                                     
================ Menu ===============================
                                                     
    1. Generate a new address                        
    2. Send dogecoins                                
    3. Create payment channel                        
    4. Make a payment on payment channel
                                                     
    0. Quit        
```

We want now to create a payment using the payment channel. You can press 4.

```bash
================ MICRO PAYMENT ================

  Amount: 2 Ð
  Payment channel address: 2MvUqM2tFEurgFL82GvbDL7Z4HFJDLYVCRV

  Press "Enter" to make payment
  Press "Return" to return to main screen
```

And press Enter to validate. Nothing will happened unfortunately (need to improve the UX). Press Return to go back to the menu.

Your payment channel balance has decreased of 2Ð.

You can repeat the "Make a payment on payment channel" until you don't have run out of fund.
```bash
================ SPV node ============================

    Height headers: 531/531
    Hash: 1df353f86c31fc249fdc09796fa639e6c4aae13f32c526c382af488c6e75294c
    Peers: 1
    Tips: ["1df353f86c31fc249fdc09796fa639e6c4aae13f32c526c382af488c6e75294c"]
    Merkle Height: 531/531

================ Wallet =============================

    Balance: 49 Ð                 

================ Payment Channels ===================
                                                     
    2MvUqM2tFEurgFL82GvbDL7Z4HFJDLYVCRV ---> 98 Ð                  
                                                                 
                                                     
================ Menu ===============================
                                                     
    1. Generate a new address                        
    2. Send dogecoins                                
    3. Create payment channel                        
    4. Make a payment on payment channel
                                                     
    0. Quit                                          
```