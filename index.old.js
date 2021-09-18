const bitcoinjs = require('bitcoinjs-lib')
const bip65 = require('bip65')

bitcoinjs.networks.dogecoin_testnet = {
    messagePrefix: '\x18Dogecoin Signed Message:\n',
    bech32: 'tdge',
    bip32: {
      public: 0x0432a9a8,
      private: 0x0432a243
    },
    pubKeyHash: 0x71,
    scriptHash: 0xc4,
    wif: 0xf1,
  };

const keyPairA = bitcoinjs.ECPair.fromPrivateKey(Buffer.from('3b187fd3a10960efe5753c9851c174c05bcdb30db22fd9deab981fe1f0ec7b00', 'hex'))

keyPairA.network = bitcoinjs.networks.dogecoin_testnet

console.log(keyPairA.privateKey.toString('hex'))
console.log(keyPairA.publicKey.toString('hex'))

console.log('------------------------------------------')

const keyPairB = bitcoinjs.ECPair.fromPrivateKey(Buffer.from('5cdc1bf38cd77f6a0f130d50e6e37b1d1e3eb59b78f3fde6c1572f44e7f709ed', 'hex'))

keyPairB.network = bitcoinjs.networks.dogecoin_testnet

console.log(keyPairB.privateKey.toString('hex'))
console.log(keyPairB.publicKey.toString('hex'))


const locktime = Buffer.from(bip65.encode({ blocks: 3321150 }).toString(16), 'hex').reverse().toString('hex')
console.log(locktime)

multisigScript = "OP_IF " + 
    locktime + "00" + " OP_CHECKLOCKTIMEVERIFY OP_DROP " +
    keyPairA.publicKey.toString('hex') + " OP_CHECKSIGVERIFY OP_ELSE OP_2 OP_ENDIF " +
    keyPairA.publicKey.toString('hex') + " " + keyPairB.publicKey.toString('hex') + " OP_2 OP_CHECKMULTISIG"

console.log(multisigScript.toString('hex'))

const { address } = bitcoinjs.payments.p2sh({
    redeem: { output: bitcoinjs.script.fromASM(multisigScript) },
    network: bitcoinjs.networks.dogecoin_testnet
})
console.log(address)

const txid = Buffer.from('7aa2de13aaa36c28f403a6d766cb6e3ec5a928b69ffe514dd2162b6ce1435bf3', 'hex').reverse().toString('hex')

// A: 89, B: 10, fee: 1
const psbt = new bitcoinjs.Psbt()

psbt.addInput({
  // if hash is string, txid, if hash is Buffer, is reversed compared to txid
  hash: '7aa2de13aaa36c28f403a6d766cb6e3ec5a928b69ffe514dd2162b6ce1435bf3',
  index: 0,

  // non-segwit inputs now require passing the whole previous tx as Buffer
  nonWitnessUtxo: Buffer.from(
    '0100000001f65d8f974ad868fefc180015802de92dfc4ecbca3599f964a78fbc841958bab6000000006b483045022100b0710ee02ed529e2f1b97ca209b3671b79798567a7ec3e2f93fe763f7bade49502203ab9c55848238ce1b498b0350d6f6533c3be40d35a59230eb131a077fcf18b09012103fd1a6b656935fb41024b3fc9936bb6ba3f19b6d79a4fa601d847958c46694564feffffff0200e40b540200000017a9140a055e90a41630a10aea3b4d05f2bac56b5ed0a58700497556a90000001976a914cc91cc65b725fd5f336a2b76eaea0c4b4fdb29da88ac40ad3200',
    'hex',
  ),
  redeemScript: bitcoinjs.script.fromASM(multisigScript)
})

console.log(psbt.getInputType(0))

psbt.addOutputs([{
    address: bitcoinjs.payments.p2pkh({ pubkey: keyPairA.publicKey }).address,
    value: 89*100000000
}, {
    address: bitcoinjs.payments.p2pkh({ pubkey: keyPairB.publicKey }).address,
    value: 10*100000000
}])

psbt.signInput(0, keyPairA)
psbt.signInput(0, keyPairB)

console.log(psbt.data.inputs[0].redeemScript.toString('hex'))

function finalScriptsFunc (inputIndex, input, script, isSegwit, isP2SH, isP2WSH) {
    return { 
        finalScriptSig: bitcoinjs.script.fromASM('OP_0 ' + input.partialSig[0].signature.toString('hex') + ' ' + input.partialSig[1].signature.toString('hex') + ' OP_0 ' + bitcoinjs.script.fromASM(multisigScript).toString('hex')),
        finalScriptWitness: null,
    }
}

psbt.finalizeInput(0, finalScriptsFunc)

console.log(psbt.extractTransaction(true).toHex())