const _                = require('lodash');
const assert           = require('assert');
const {Ed25519Keypair} = require('@onelabs/sui/keypairs/ed25519');
const {Transaction}    = require('@onelabs/sui/transactions');
const Bcs              = require('@onelabs/bcs');
const Utils            = require('./utils');


describe('Connection', function() {
  this.timeout(500000);
  let connection, user;
  let receiverKeypair = Ed25519Keypair.generate();
  let receiver        = receiverKeypair.getPublicKey().toSuiAddress();
  let currencies      = [];
  let usdh;
  let userBeforeBalance;
  before(async function() {
    let _init  = await Utils.init();
    connection = _init.connection;
    user       = _init.user;
  });

  it('# getChainCurrencies', async function() {
    let currencyList = await connection.getChainCurrencies();
    // console.log("----------------------------------------------getChainCurrencies: ", currencyList);
    assert(!!currencyList.length, 'Currency list should be not empty.');
    let oneChainCurrency = _.filter(currencyList, {chain: 'ONECHAIN'});
    assert(!!oneChainCurrency.length, 'One chain currency should be not empty');
    oneChainCurrency.forEach(doc => currencies.push(...doc.currencyList));
    usdh = _.find(currencies, {currency: 'USDH'});
    assert(!!usdh, 'USDH should be exists,');
  });

  it('# getBalance', async function() {
    // console.log(usdh);
    let balance = await Utils.provider.getBalance({
      owner:    user.address,
      coinType: usdh.coinType,
    });
    // console.log("----------------------------------------------getBalance: ", balance);
    assert(!!balance, 'The current user USDH balance should exist');
    assert(Number(balance.totalBalance) > 0, 'The current user USDH balance should be greater than 0');
    userBeforeBalance = Number(balance.totalBalance);
  });

  it('# getWalletInfo', async function() {
    let walletList = await connection.getWalletInfo({
      address: user.address,
      did:     user.did,
    });
    // console.log("----------------------------------------------getWalletInfo: ", walletList);
    assert(!!walletList.length, 'Current user wallet should be not empty.');
    let oneChainWallet = _.find(walletList, {chain: 'ONECHAIN'});
    assert(oneChainWallet.address === user.address, 'User one chain address should be equal zk login address');
    assert(oneChainWallet.did === user.did, 'User one chain did should be equal current did');
  });

  let transferTx = {
    amount:   Number((Math.random() * 9 + 1).toFixed(2)),
    remark:   'js sdk test',
  };
  it('# buildTransferTransaction', async function() {
    transferTx.coinType =usdh.coinType;
    transferTx.fromAddress = user.address;
    transferTx.toAddress   = receiver;
    let transaction        = await connection.buildTransferTransaction(transferTx);
    // console.log("----------------------------------------------buildTransferTransaction: ", transaction);
    assert(!!transaction.rawTransaction, 'Build transfer transaction result should contain rawTransaction');
    assert(!!transaction.hash, 'Build transfer transaction result should contain hash');
    transferTx = _.assign(transferTx, transaction);
  });
  //
  it('# sendTransferTransaction', async function() {
    let zkLoginSignature = await Utils.zkSignTransaction(user, transferTx.rawTransaction);
    // console.log("----------------------------------------------zkLoginSignature: ", zkLoginSignature);
    let options          = {
      hash:    transferTx.hash,
      txBytes: transferTx.rawTransaction,
      userSig: zkLoginSignature,
    };
    const result         = await connection.sendTransferTransaction(options);
    // console.log("----------------------------------------------sendTransferTransaction: ", result);
    assert(result.status === 'SUCCESS', 'Send transfer transaction should success.');
    assert(result.hash === transferTx.hash, 'Send transfer transaction hash should be equal transferTx.hash');

    await Utils.sleep(1000);
    let senderBalance = await Utils.provider.getBalance({
      owner:    user.address,
      coinType: usdh.coinType,
    });
    assert(!!senderBalance, 'The sender USDH balance should exist');
    assert(Number(senderBalance.totalBalance) + transferTx.amount * 10 ** usdh.calculateDecimals === userBeforeBalance, 'The sender balance should be equal to the before balance minus the transfer amount');

    let receiverBalance = await Utils.provider.getBalance({
      owner:    receiver,
      coinType: usdh.coinType,
    });
    assert(!!receiverBalance, 'The receiver USDH balance should exist');
    assert(Number(receiverBalance.totalBalance) === transferTx.amount * 10 ** usdh.calculateDecimals, 'The receiver USDH balance should be equal to the transfer amount');
  });

  it('# getTransaction', async function() {
    let tx = await connection.getTransaction({hash: transferTx.hash});
    // console.log("----------------------------------------------getTransaction: ", tx);
    assert(!!tx, `Order ${transferTx.hash} should be exists.`);
    assert(tx.status === 'SUCCESS', 'Tx status should be equal success.');
    assert(tx.amount === transferTx.amount.toString(), 'Tx amount should be equal transfer amount.');
  });

  it('# getTransactions', async function() {
    let txs = await connection.getTransactions({});
    // console.log("----------------------------------------------getTransaction: ", txs);
    assert(!!txs.rows.length, 'Current user tx list should be not empty.');
    let tx = _.find(txs.rows, {hash: transferTx.hash});
    assert(!!tx, 'Tx list should be contain transfer tx');
    assert(tx.status === 'SUCCESS', 'Send transfer transaction should success.');
  });

  let sponsorTransaction;
  it('# buildSponsorTransaction', async function() {
    // Get receiver usdh coin objectId
    let coinObjects = await Utils.provider.getCoins({
      owner:    receiver,
      coinType: usdh.coinType,
    });
    assert(coinObjects && coinObjects.data && coinObjects.data.length === 1, 'Receiver usdh coin objects should be not empty.');

    let coinObject = coinObjects.data[0].coinObjectId;

    // New transferObjects transaction
    let transaction = new Transaction();
    transaction.transferObjects([transaction.object(coinObject)], transaction.pure.address(user.address));

    let onlyTransactionKind = true;
    const transactionBytes  = await transaction.build({
      client: Utils.provider,
      onlyTransactionKind,
    });
    const rawTransaction    = Bcs.toB64(transactionBytes);
    //Request one chain wallet append gas sponsor payment
    sponsorTransaction      = await connection.buildSponsorTransaction({
      address:   receiver,
      gasBudget: '0.001',
      onlyTransactionKind,
      rawTransaction,
    });
    // console.log("----------------------------------------------buildSponsorTransaction: ", sponsorTransaction);
    assert(!!sponsorTransaction.hash, 'SponsorTransaction should be contain hash');
    assert(!!sponsorTransaction.rawTransaction, 'SponsorTransaction should be contain rawTransaction');
    assert(!!sponsorTransaction.sponsor, 'SponsorTransaction should be contain sponsor');
    assert(!!sponsorTransaction.reservationId, 'SponsorTransaction should be contain reservationId');
  });

  it('# sendSponsorTransaction', async function() {
    //Use the receiver private key to sign the transaction
    let {signature} = await receiverKeypair.signTransaction(Bcs.fromBase64(sponsorTransaction.rawTransaction));

    //Request one chain wallet send signed tx
    let transaction = await connection.sendSponsorTransaction({
      reservationId: sponsorTransaction.reservationId,
      txBytes:       sponsorTransaction.rawTransaction,
      userSig:       signature,
    });
    // console.log("----------------------------------------------sendSponsorTransaction: ", transaction);
    assert(!!transaction, 'Send sponsor transaction result should be not empty.');
    assert(transaction.hash === sponsorTransaction.hash, 'Send sponsor transaction result should be equal build hash.');
    assert(transaction.status, 'Send sponsor transaction should be not success.');

    await Utils.sleep(1000);

    //Check user balance
    let userBalance = await Utils.provider.getBalance({
      owner:    user.address,
      coinType: usdh.coinType,
    });
    assert(!!userBalance, 'The user USDH balance should exist');
    assert(Number(userBalance.totalBalance) === userBeforeBalance, 'The user current USDH balance should be equal to the before balance');

    //Check receiver balance
    let receiverBalance = await Utils.provider.getBalance({
      owner:    receiver,
      coinType: usdh.coinType,
    });
    assert(!!receiverBalance, 'The receiver USDH balance should exist');
    assert(Number(receiverBalance.totalBalance) === 0, 'The receiver USDH balance should be equal to 0');
  });
});
