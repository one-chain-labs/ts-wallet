[TOC]
# One chain wallet js sdk

### [Full documents](doc/index.html)

## Installation
### For use in Node.js or a web application
```shell
npm install @onelabs/wallet --save
```
### For use in a browser, without a build system
```html
<!-- Development (un-minified) -->
<script src="https://unpkg.com/@onelabs/wallet@latest/lib/index.iife.js"></script>

<!-- Production (minified) -->
<script src="https://unpkg.com/@onelabs/wallett@latest/lib/index.iife.min.js"></script>
```

## Testing
```shell
npm run test
```

***

## Documentation and examples
### Init
```js
const {Connection, clusterApiUrl} = require("@onelabs/wallet");
//Or import {Connection, clusterApiUrl} from ("@onelabs/wallet");

const connection = new Connection(clusterApiUrl("devnet"),{});
```

### Login and get ZkProofs
```js
//Huione user
let user = {
    mobile:       "mobile number",
    mobilePrefix: "mobile prefix",
    merchantId:   "user merchant id",
    merchantKey:  "user merchant secretKey(RSA private key)",
};

let code = await connection.requestSmsCode(rsaEncrypt({
    merchantId:   user.merchantId,
    mobile:       user.mobile,
    mobilePrefix: user.mobilePrefix,
    timestamp:    Date.now(),
}, user.merchantKey));

let {code: authCode} = await connection.authenticateSms({
    code:         code,
    mobile:       user.mobile,
    mobilePrefix: user.mobilePrefix,
    smsCode:      "000000", //User receives verification code via mobile phone
});


// Install @onelabs/sui node-rsa
// npm i @onelabs/sui @onelabs/bcs node-rsa --save

const zk               = require('@onelabs/sui/zklogin');
const {Ed25519Keypair} = require('@onelabs/sui/keypairs/ed25519');
const {fromB64}        = require('@onelabs/bcs');
const _                = require('lodash');
const NodeRSA          = require('node-rsa');
const {
        SuiClient,
        getFullnodeUrl,
      }                = require('@onelabs/sui/client');

const provider = new SuiClient({ url: getFullnodeUrl('devnet') });

const rsaEncrypt = (options, privateKey) => {
    let rsa  = new NodeRSA(privateKey, "pkcs8-private");
    let keys = _.sortBy(_.keys(options));
    let str  = [];
    _.each(keys, (key) => {
        if (!_.includes([null, undefined, ""], options[key])) {
            let value = _.isArray(options[key]) ? JSON.stringify(options[key]) : options[key];
            str.push(`${key}=${value}`);
        }
    });
    options.merchantSign = rsa.sign(Buffer.from(str.join("&")), "base64", "utf8");
    return options;
};

// Get one chain current system info
const geSystemState = async () => {
    const systemState = await provider.getLatestSuiSystemState();
    return _.pick(systemState, ["epoch", "epochDurationMs", "epochStartTimestampMs"]);
};

// Use zklogin sign transaction
const zkSignTransaction = async (user, rawTransaction) => {
    let {signature: userSignature} = await Ed25519Keypair.fromSecretKey(user.zk.ephemeralKeyPair.secretKey).signTransaction(fromB64(rawTransaction));
    return zk.getZkLoginSignature({
        inputs:   {
            ...user.zk.zkpoof,
            addressSeed: user.addressSeed,
        },
        maxEpoch: user.zk.maxEpoch,
        userSignature,
    });
};

const generateZk = async () => {
    const suiSysState                = await geSystemState();
    const ephemeralKeyPair           = new Ed25519Keypair();
    const maxEpoch                   = Number(suiSysState.epoch) + 2;
    const randomness                 = zk.generateRandomness();
    const nonce                      = zk.generateNonce(ephemeralKeyPair.getPublicKey(), maxEpoch, randomness);
    const extendedEphemeralPublicKey = zk.getExtendedEphemeralPublicKey(ephemeralKeyPair.getPublicKey());
    return {
        maxEpoch,
        randomness,
        ephemeralKeyPair: {
            secretKey: ephemeralKeyPair.getSecretKey(),
            keyScheme: ephemeralKeyPair.getKeyScheme(),
        },
        nonce,
        extendedEphemeralPublicKey,
        suiSysState
    };
};


let zkConfig = await generateZk();
user.zk = zkConfig;

//Get login token and gwt token
let tokenResponse = await connection.zkLogin({
    code:  authCode,
    nonce: user.zk.nonce,
});

// TODO Set login token to connection headers.
connection.setToken({
    ACCESS_TOKEN: tokenResponse.accessToken,
});

user.accessToken = tokenResponse.accessToken;
user.decodedJwt  = tokenResponse.accessTokenProfile;
user.jwtToken    = tokenResponse.jwtToken;
user.salt        = tokenResponse.salt;
user.addressSeed = zk.genAddressSeed(tokenResponse.salt, "sub", tokenResponse.accessTokenProfile.sub, tokenResponse.accessTokenProfile.aud).toString();
user.address     = zk.jwtToAddress(tokenResponse.jwtToken, tokenResponse.salt);
user.did         = tokenResponse.did;

// Get zkpoofs

user.zk.zkpoof = await connection.getZkProofs({
    maxEpoch:                   user.zk.maxEpoch,
    jwtRandomness:              user.zk.randomness,
    extendedEphemeralPublicKey: user.zk.extendedEphemeralPublicKey,
    jwt:                        user.jwtToken,
    salt:                       user.salt,
    keyClaimName:               "sub",
});

//Cache user to storage
```

### Build transaction and sign it to send
```js
// Build and send transfer transaction
let transferTx = await connection.buildTransferTransaction({
    amount:      1,
    currency:    "USDH",
    remark:      "wallet js sdk test",
    fromAddress: user.address,
    toAddress:   Ed25519Keypair.generate().getPublicKey().toSuiAddress()
});

// Signing with ZkLogin
const zkLoginSignature = await zkSignTransaction(user, transferTx.rawTransaction);

//Broadcast and execute transactions
const transaction = await connection.sendTransferTransaction({
    hash: transferTx.hash,
    txBytes: transferTx.rawTransaction,
    userSig: zkLoginSignature,
})
console.log(transaction);
```
