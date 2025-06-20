const {
        Connection,
        clusterApiUrl,
      }                = require('../lib/index.cjs.js');
const zk               = require('@onelabs/sui/zklogin');
const {
        SuiClient,
        getFullnodeUrl,
      }                = require('@onelabs/sui/client');
const {Ed25519Keypair} = require('@onelabs/sui/keypairs/ed25519');
const {fromB64}        = require('@onelabs/bcs');
const config           = require('./config/config');
const fs               = require('fs');
const Path             = require('path');
const _                = require('lodash');
const NodeRSA          = require('node-rsa');


const provider = new SuiClient({url: getFullnodeUrl('devnet')});

const geSystemState = async () => {
  const systemState = await provider.getLatestSuiSystemState();
  return _.pick(systemState, ['epoch', 'epochDurationMs', 'epochStartTimestampMs']);
};

const sleep = async ms => {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
};

const checkFile = filePath => {
  const dirname = Path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return;
  }
  checkFile(dirname);
  fs.mkdirSync(dirname, {recursive: true});
};

const checkUserLogin = user => {
  return (user && user.jwtToken && user.accessToken && user.decodedJwt && user.decodedJwt.exp);
};

const verifyToken = user => {
  return (user.zk && Date.now() < new Date(Number(user.decodedJwt.exp) * 1000).getTime() && Date.now() < (user.zk.maxEpoch - Number(user.zk.suiSysState.epoch)) * Number(user.zk.suiSysState.epochDurationMs) + Number(user.zk.suiSysState.epochStartTimestampMs));
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
    suiSysState,
  };
};

const cacheUser = user => {
  fs.writeFileSync(config.userProfilePath, JSON.stringify(user, null, 4));
};

const getUser = () => {
  try {
    fs.accessSync(config.userProfilePath, fs.constants.F_OK);
  } catch (error) {
    if (error.code === 'ENOENT') {
      fs.writeFileSync(config.userProfilePath, '{}');
    }
  }
  return JSON.parse(fs.readFileSync(config.userProfilePath, 'utf8'));
};

const rsaEncrypt = (options, privateKey) => {
  let rsa  = new NodeRSA(privateKey, 'pkcs8-private');
  let keys = _.sortBy(_.keys(options));
  let str  = [];
  _.each(keys, key => {
    if (!_.includes([null, undefined, ''], options[key])) {
      let value = _.isArray(options[key]) ? JSON.stringify(options[key]) : options[key];
      str.push(`${key}=${value}`);
    }
  });
  options.merchantSign = rsa.sign(Buffer.from(str.join('&')), 'base64', 'utf8');
  console.log(options);
  return options;
};

const init = async () => {
  const cluster    = clusterApiUrl('devnet', false);
  console.log({cluster})
  const connection = new Connection(cluster, {});

  checkFile(config.userProfilePath);

  let user = _.assign(getUser(), config.user);

  if (!checkUserLogin(user)) {
    console.log('Login......................');
    user.zk = await generateZk();
    cacheUser(user);

    // Login and save token to storage
    let code = await connection.requestSmsCode(rsaEncrypt({
      merchantId:   user.merchantId,
      mobile:       user.mobile,
      mobilePrefix: user.mobilePrefix,
      timestamp:    Date.now(),
    }, user.merchantKey));
    console.log("----------------------------------------------requestSmsCode: ", code);

    let {code: authCode} = await connection.authenticateSms({
      code:         code,
      mobile:       user.mobile,
      mobilePrefix: user.mobilePrefix,
      smsCode:      '000000',
    });
    console.log("----------------------------------------------authenticateSms: ", authCode);


    let zkLoginResult = await connection.zkLogin({
      code:  authCode,
      nonce: user.zk.nonce,
    });
    console.log("----------------------------------------------zkLoginResult: ", zkLoginResult);


    // TODO 设置请求headers.Token
    connection.setToken({
      ACCESS_TOKEN: zkLoginResult.accessToken,
    });

    user.accessToken = zkLoginResult.accessToken;
    user.decodedJwt  = zkLoginResult.accessTokenProfile;
    user.jwtToken    = zkLoginResult.jwtToken;
    user.salt        = zkLoginResult.salt;
    user.addressSeed = zk
      .genAddressSeed(zkLoginResult.salt, 'sub', zkLoginResult.accessTokenProfile.sub, zkLoginResult.accessTokenProfile.aud)
      .toString();
    user.address     = zk.jwtToAddress(zkLoginResult.jwtToken, zkLoginResult.salt);
    user.did         = zkLoginResult.did;
    cacheUser(user);
    connection.setToken({
      ACCESS_TOKEN: user.accessToken,
    });
  }

  if (!verifyToken(user)) {
    connection.setToken({
      ACCESS_TOKEN: user.accessToken,
    });
    console.log('The token has expired');
    user.zk = await generateZk();
    cacheUser(user);

    const refreshJwtTokenRes = await connection.refreshToken({
      nonce: user.zk.nonce,
    });
    console.log("----------------------------------------------refreshJwtTokenRes: ", refreshJwtTokenRes);


    user.accessToken = refreshJwtTokenRes.accessToken;
    user.decodedJwt  = refreshJwtTokenRes.accessTokenProfile;
    user.jwtToken    = refreshJwtTokenRes.jwtToken;
    user.salt        = refreshJwtTokenRes.salt;
    user.addressSeed = zk
      .genAddressSeed(refreshJwtTokenRes.salt, 'sub', refreshJwtTokenRes.accessTokenProfile.sub, refreshJwtTokenRes.accessTokenProfile.aud)
      .toString();
    user.address     = zk.jwtToAddress(refreshJwtTokenRes.jwtToken, refreshJwtTokenRes.salt);
    cacheUser(user);
    connection.setToken({
      ACCESS_TOKEN: user.accessToken,
    });
  }

  connection.setToken({
    ACCESS_TOKEN: user.accessToken,
  });

  if (!user.zk.zkpoof) {
    console.log('Get zkpoof......................');
    user.zk.zkpoof = await connection.getZkProofs({
      maxEpoch:                   user.zk.maxEpoch,
      jwtRandomness:              user.zk.randomness,
      extendedEphemeralPublicKey: user.zk.extendedEphemeralPublicKey,
      jwt:                        user.jwtToken,
      salt:                       user.salt,
      keyClaimName:               'sub',
    });
    console.log("----------------------------------------------getZkProofs: ", user.zk);

    cacheUser(user);
  }
  return {
    connection,
    user,
  };
};

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

module.exports = {
  init,
  getUser,
  generateZk,
  verifyToken,
  sleep,
  zkSignTransaction,
  provider,
};
