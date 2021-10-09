const fs = require('fs')
const Docker = require('dockerode')
const axios = require('axios')
const docker = new Docker()
const bitcoinjs = require('bitcoinjs-lib')
const bip65 = require('bip65')

// Dogecoin JSON RPC token
const token = Buffer.from('hello:world', 'utf8').toString('base64')

// Initialize Dogecoin testnet info
bitcoinjs.networks.dogecoin_regtest = {
  messagePrefix: '\x18Dogecoin Signed Message:\n',
  bech32: 'tdge',
  bip32: {
    public: 0x0432a9a8,
    private: 0x0432a243
  },
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0xef,
}

function finalScriptsFunc (inputIndex, input, script, isSegwit, isP2SH, isP2WSH) {
  return { 
      finalScriptSig: bitcoinjs.script.fromASM('OP_0 ' + input.partialSig[0].signature.toString('hex') + ' ' + input.partialSig[1].signature.toString('hex')),
      finalScriptWitness: null,
  }
}

function jsonRPC (command, params) {
	return axios.post('http://127.0.0.1:18332', {
		jsonrpc: '1.0',
		id: 'wow',
		method: command, 
		params: params
	}, {
    headers: {
      'Authorization': `Basic ${token}`,
      'Content-Type': 'application/json'
    },
  })
}

async function main () {
  let result

	const container = await docker.createContainer({
		Image: 'xanimo/dogecoin-core:ubuntu',
		name: 'dogecoind_regtest',
		PortBindings: { ['18444/tcp']: [{ HostIp: '0.0.0.0', HostPort: '18444' }], ['18332/tcp']: [{ HostIp: '0.0.0.0', HostPort: '18332' }] },
		NetworkMode: 'host',
    Binds: ['/home/lola/Workspace/Dogecoin/doge-payment-channel/data:/root/.dogecoin'],
	})
	
	console.log('container created')
	
  await container.start({})
	
	console.log('container started')

	// Wait 5 seconds
  // Needed otherwise we try to connect when node is not ready
  await new Promise(resolve => setTimeout(resolve, 5000));


  // We nee dto change permissions because container is running root
  container.exec({ Cmd: ['chown', '1000:1000', '/root/.dogecoin/', '-R'] }, async function (rep, exec) { 
    await exec.start({})
  })

  console.log('Updated folder permissions')

  /*
      Setup
  */

  console.log('Generate 150 blocks')

	result = await jsonRPC('generate', [150])

  // Generate Alice key pair from private key
  const keyPairA = bitcoinjs.ECPair.fromPrivateKey(Buffer.from('3b187fd3a10960efe5753c9851c174c05bcdb30db22fd9deab981fe1f0ec7b00', 'hex'))
  keyPairA.network = bitcoinjs.networks.dogecoin_regtest

  // Generate Bob key pair from private key
  const keyPairB = bitcoinjs.ECPair.fromPrivateKey(Buffer.from('5cdc1bf38cd77f6a0f130d50e6e37b1d1e3eb59b78f3fde6c1572f44e7f709ed', 'hex'))
  keyPairB.network = bitcoinjs.networks.dogecoin_regtest

  // Fill Alice wallet with some regtest coins
  const Alice = bitcoinjs.payments.p2pkh({ pubkey: keyPairA.publicKey, network: bitcoinjs.networks.dogecoin_regtest})
  console.log(`Alice address : ${Alice.address}`)

  const Bob = bitcoinjs.payments.p2pkh({ pubkey: keyPairB.publicKey, network: bitcoinjs.networks.dogecoin_regtest})
  console.log(`Address address : ${Bob.address}`)


  // Send some funds to Alice
  console.log('Send 150 Doges to Alice')
  result = await jsonRPC('sendtoaddress', [Alice.address, 150])
  const txid = result.data.result

  console.log('Generate 50 blocks')
	result = await jsonRPC('generate', [50])

  /* Save Bob address has a watch-only address */
  console.log(`Import Bob pubkey ${keyPairB.publicKey.toString('hex')}`)
  result = await jsonRPC('importpubkey', [keyPairB.publicKey.toString('hex'), "Bob"])
  console.log(result.data)

  /* list account */
  result = await jsonRPC('listaccounts', [0, true])
  console.log(result.data)
  
  // testing notify
  console.log('Send 150 Doges to Bob')
  result = await jsonRPC('sendtoaddress', [Bob.address, 150])
  console.log(result.data)

  /*
      Start Payment Channel
  */

  console.log('Create multisig transaction')


  const locktime = Buffer.from(bip65.encode({ blocks: 300 }).toString(16), 'hex').reverse().toString('hex')
  
  multisigScript = "OP_IF " + 
      locktime + "00" + " OP_CHECKLOCKTIMEVERIFY OP_DROP " +
      keyPairA.publicKey.toString('hex') + " OP_CHECKSIGVERIFY OP_ELSE OP_2 OP_ENDIF " +
      keyPairA.publicKey.toString('hex') + " " + keyPairB.publicKey.toString('hex') + " OP_2 OP_CHECKMULTISIG"
    
  console.log(bitcoinjs.script.fromASM(multisigScript).toString('hex'))

  /*const p2sh = bitcoinjs.payments.p2sh({
      redeem: { output: bitcoinjs.script.fromASM(multisigScript) },
      network: bitcoinjs.networks.dogecoin_regtest
  })

  console.log(`P2SH address : ${p2sh.address}`)*/

  // Create initial transaction that funds a multisig
	result = await jsonRPC('getrawtransaction', [txid])

  console.log(result.data.result)

  let transaction = await jsonRPC('decoderawtransaction', [result.data.result])
  let index = 0
  transaction.data.result.vout.map(function (output) {
    if (output.scriptPubKey.addresses.includes(Alice.address)) {
      index = output.n
    }
  })

  console.log(index)

  const psbt = new bitcoinjs.Psbt()
  psbt.addInput({
    // if hash is string, txid, if hash is Buffer, is reversed compared to txid
    hash: txid,
    index: index,
    // non-segwit inputs now require passing the whole previous tx as Buffer
    nonWitnessUtxo: Buffer.from(result.data.result, 'hex')
  })

  psbt.addOutputs([{
    //script: bitcoinjs.script.fromASM('OP_HASH160 ' + p2sh.hash.toString('hex') + ' OP_EQUAL'),
    script: bitcoinjs.script.fromASM(multisigScript),
    value: 100*100000000
  }])

  psbt.signInput(0, keyPairA)
  psbt.finalizeAllInputs()

  const transactionMultisig = psbt.extractTransaction(true).toHex()

  console.log('Create multisig')
  result = await jsonRPC('sendrawtransaction', [transactionMultisig])
  const txidMultisig = result.data.result

  console.log(txidMultisig)

  console.log('Generate 50 blocks')
	result = await jsonRPC('generate', [50])

  // list account
  result = await jsonRPC('listtransactions', ["Bob", 10, 0, true])
  console.log(result.data)
  /*
    Create ready to be broadcast transaction as payment (but don't broadcast them!)
  */

  // Alice: 89, Bob: 10, fee: 1
  const psbt2 = new bitcoinjs.Psbt()

  // get raw transaction
	result = await jsonRPC('getrawtransaction', [txidMultisig])
  console.log(result.data)

  psbt2.addInput({
    // if hash is string, txid, if hash is Buffer, is reversed compared to txid
    hash: txidMultisig,
    index: 0,
    // non-segwit inputs now require passing the whole previous tx as Buffer
    nonWitnessUtxo: Buffer.from(result.data.result, 'hex'),
    //redeemScript: bitcoinjs.script.fromASM(multisigScript)
  })

  psbt2.addOutputs([{
      address: bitcoinjs.payments.p2pkh({ pubkey: keyPairA.publicKey }).address,
      value: 89*100000000
  }, {
      address: bitcoinjs.payments.p2pkh({ pubkey: keyPairB.publicKey }).address,
      value: 10*100000000
  }])

  psbt2.signInput(0, keyPairA)
  psbt2.signInput(0, keyPairB)

  psbt2.finalizeInput(0, finalScriptsFunc)

  console.log(psbt2.extractTransaction(true).toHex())

  console.log('FIRST PAYMENT DONE!')

  /*
    Create second payment (and broadcast it to close payment channel)
  */

  // Alice: 79, Bob: 20, fee: 1
  const psbt3 = new bitcoinjs.Psbt()

  psbt3.addInput({
    // if hash is string, txid, if hash is Buffer, is reversed compared to txid
    hash: txidMultisig,
    index: 0,
    // non-segwit inputs now require passing the whole previous tx as Buffer
    nonWitnessUtxo: Buffer.from(result.data.result, 'hex'),
    redeemScript: bitcoinjs.script.fromASM(multisigScript)
  })

  psbt3.addOutputs([{
      address: bitcoinjs.payments.p2pkh({ pubkey: keyPairA.publicKey }).address,
      value: 79*100000000
  }, {
      address: bitcoinjs.payments.p2pkh({ pubkey: keyPairB.publicKey }).address,
      value: 20*100000000
  }])

  psbt3.signInput(0, keyPairA)
  psbt3.signInput(0, keyPairB)

  psbt3.finalizeInput(0, finalScriptsFunc)

  const finalTransaction = psbt3.extractTransaction(true).toHex()
  console.log(finalTransaction)
  /*result = await jsonRPC('sendrawtransaction', [finalTransaction])
  console.log(result)*/

  console.log('PAYMENT CHANNEL CLOSE!')

  await container.stop()
  //await container.remove()

	console.log('container stop')

  fs.rmdirSync('/home/lola/Workspace/Dogecoin/doge-payment-channel/data/regtest', { recursive: true });
  //fs.rmSync('/home/lola/Workspace/Dogecoin/doge-payment-channel/data/alert.log')
}

main()