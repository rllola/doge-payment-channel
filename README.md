# Dogecoin payment channel

This is an example repository to help in the implementation of an **unidirectional** payment channel.

The script will start a dogecoind regtest node inside a docker container. Initiate a payment channel using a p2sh multisig. Sign 2 payments. Close the payment channel by broadcasting the final transaction.

## Dev

```
$ npm install
$ npm start
```

## NOTES

`index.old.js` was a first draft.