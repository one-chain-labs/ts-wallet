import {Client, ClientOptions, Token} from './client';

export const PATHS = {
    AUTHENTICATE_SMS: '/did/authenticateSms',
    ZK_LOGIN: '/did/getToken',
    GET_USER: '/did/getTokenUserProfile',
    GET_ZK_PROOFS: '/did/getZkProofs',
    REFRESH_TOKEN: '/did/refreshJwtToken',
    REQUEST_SMS_CODE: '/did/sendCode',
    BUILD_SPONSOR_TRANSACTION: '/transfer/buildSponsorTransaction',
    BUILD_TRANSFER_TRANSACTION: '/transfer/createOrder',
    SEND_SPONSOR_TRANSACTION: '/transfer/doProxyPayTx',
    GET_TRANSACTIONS: '/transfer/pageList',
    GET_TRANSACTION: '/transfer/queryOrder',
    SEND_TRANSFER_TRANSACTION: '/transfer/sendTx',
    GET_TRANSACTIONS_BY_CHAIN: '/tx/queryTx',
    GET_CHAIN_CURRENCIES: '/wallet/queryChainCurrencyForList',
    GET_WALLET_INFO: '/wallet/queryUserWalletForList',
};

/**
 * Options for did authenticateSms request
 */
export type AuthenticateSmsOptions = {
    /** The code returned after the verification code is successfully sent */
    code: string;
    /** Mobile number */
    mobile: string;
    /** Mobile prefix */
    mobilePrefix: string;
    /** Mobile verification code */
    smsCode: string;
};

/**
 * Options for did zkLogin request
 */
export type ZkLoginOptions = {
    /** Authorization Code */
    code: string;
    /** Random string */
    nonce: string;
};

/**
 * Options for did getZkProofs request
 */
export type GetZkProofsOptions = {
    /** Ephemeral public key */
    extendedEphemeralPublicKey?: string;
    /** Jwt-token */
    jwt?: string;
    /** Jwt nonce */
    jwtRandomness?: string;
    /** Jwt-sub, user number */
    keyClaimName?: string;
    /** ZkProofs maximum supported epoch is 30 plus the current epoch */
    maxEpoch?: number;
    /** Salt */
    salt?: string;
};

/**
 * Options for did refreshToken request
 */
export type RefreshTokenOptions = {
    /** Nonce */
    nonce: string;
};

/**
 * Options for did requestSmsCode request
 */
export type RequestSmsCodeOptions = {
    /** Merchant id */
    merchantId: string;
    /** Merchant RSA signature */
    merchantSign: string;
    /** Mobile number */
    mobile: string;
    /** Mobile prefix */
    mobilePrefix: string;
    /** Timestamp, in milliseconds */
    timestamp: number;
};

/**
 * Options for transfer buildSponsorTransaction request
 */
export type BuildSponsorTransactionOptions = {
    /** Sender address */
    address: string;
    /** GasBudget(e.g: 0.001) */
    gasBudget?: string;
    /** Whether to build offline */
    onlyTransactionKind?: boolean;
    /** Transaction string to be signed(base64) */
    rawTransaction: string;
};

/**
 * Options for transfer buildTransferTransaction request
 */
export type BuildTransferTransactionOptions = {
    /** Transfer amount */
    amount?: number;
    /** Transfer coin type */
    coinType?: string;
    /** Transfer from address */
    fromAddress: string;
    /** Transfer destination address */
    toAddress?: string;
    /** Transfer remark */
    remark?: string;
};

/**
 * Options for transfer sendSponsorTransaction request
 */
export type SendSponsorTransactionOptions = {
    /** reservationId */
    reservationId?: string;
    /** Transaction raw data */
    txBytes?: string;
    /** Transaction signature data */
    userSig?: string;
};

/**
 * Options for transfer getTransactions request
 */
export type GetTransactionsOptions = {
    /** Start time, format: yyyy-MM-dd */
    beginTime?: number;
    /** Completion start time, format: yyyy-MM-dd  */
    completeBeginTime?: number;
    /** Completion end time, format: yyyy-MM-dd  */
    completeEndTime?: number;
    /** Transfer currency */
    currency?: string;
    /** End time, format: yyyy-MM-dd  */
    endTime?: number;
    /** Transaction hash */
    hash?: string;
    /** Page index */
    pageIndex: number;
    /** Page size */
    pageSize: number;
    /** Status list:
     * UN_PAY: Payment to be made
     * RUNNING: Transferring
     * SUCCESS: Transfer successful
     * FAIL: Transfer failed
     * CANCEL: Cancelled
     * TIMEOUT: Signature timeout
     * */
    statusList?: [string];
    /** 接收方地址 */
    toAddress?: string;
};

/**
 * Options for transfer getTransaction request
 */
export type GetTransactionOptions = {
    /** Start time, format: yyyy-MM-dd */
    beginTime?: number;
    /** 完成开始时间 yyyy-MM-dd */
    completeBeginTime?: number;
    /** Completion start time, format: yyyy-MM-dd  */
    completeEndTime?: number;
    /** Transfer currency */
    currency?: string;
    /** End time, format: yyyy-MM-dd  */
    endTime?: number;
    /** Transaction hash */
    hash?: string;
    /** Status list:
     * UN_PAY: Payment to be made
     * RUNNING: Transferring
     * SUCCESS: Transfer successful
     * FAIL: Transfer failed
     * CANCEL: Cancelled
     * TIMEOUT: Signature timeout
     * */
    statusList?: [string];
    /** Transfer destination address */
    toAddress?: string;
};

/**
 * Options for transfer sendTransferTransaction request
 */
export type SendTransferTransactionOptions = {
    /** Transaction hash */
    hash?: string;
    /** Transaction raw data */
    txBytes?: string;
    /** Transaction signature data */
    userSig?: string;
};

/**
 * Options for tx getTransactionsByChain request
 */
export type GetTransactionsByChainOptions = {
    /** Address */
    address: string;
    /** CHAIN */
    chain: string;
    /** DID */
    did?: string;
    /** Page index */
    pageIndex: number;
    /** Page size */
    pageSize: number;
};

/**
 * Options for wallet getWalletInfo request
 */
export type GetWalletInfoOptions = {
    /** Address */
    address?: string;
    /** Did */
    did?: string;
};

/**
 * Result for did authenticateSms response
 */
export type AuthenticateSmsResult = {
    /** Authenticate code */
    code: string;
};

/**
 * Result for did zkLogin field accessTokenProfile
 */
export type AccessTokenProfile = {
    /** Receiver */
    aud: string;
    /** Authorized party */
    azp: string;
    /** Token expiration time */
    exp: number;
    /** Token issuance time */
    iat: number;
    /** Issuer */
    iss: string;
    /** Token unique identifier */
    jti: string;
    /** Token validity period */
    nbf: number;
    /** Nonce */
    nonce: string;
    /** Subject */
    sub: string;
};

/**
 * Result for did zkLogin response
 */
export type LoginResult = {
    /** Access Token */
    accessToken: string;
    /** Access token profile */
    accessTokenProfile: AccessTokenProfile;
    /** Is anonymous*/
    anonymous: boolean;
    /** User avatar */
    avatar: string;
    /** User avatar url */
    avatarUrl: string;
    /** Channel user number */
    channelUserNo: string;
    /** Did */
    did: string;
    /** Token expiration time */
    expireTime: number;
    /** id */
    id: number;
    /** JWT-Token */
    jwtToken: string;
    /** User nickname */
    nickname: string;
    /** Provider: hc */
    provider: string;
    /** User salt value */
    salt: string;
    /** Whether to set a payment password */
    settingPayPassword: boolean;
    /** User name */
    userName: string;
    /** User number */
    userNo: string;
    /** Merchant name */
    walletName: string;
    /** Merchant id */
    walletType: string;
};

export type ProofPoints = {
    a: [string];
    b: [[string]];
    c: [string];
};

export type IssBase64Details = {
    value: string;
    indexMod4: number;
};

/**
 * Result for did getZkProofs response
 */
export type GetZkProofsResult = {
    proofPoints: ProofPoints;
    issBase64Details: IssBase64Details;
    headerBase64: string;
};


/**
 * Result for transfer buildSponsorTransaction response
 */
export type BuildSponsorTransactionResult = {
    /** Transaction expiration time  */
    expiration: number;
    /** Transaction hash */
    hash: string;
    /** Transaction raw data */
    rawTransaction: string;
    /** reservationId */
    reservationId: string;
    /** Transaction gas sponsor address */
    sponsor: string;
};

/**
 * Result for transfer buildTransferTransaction response
 */
export type BuildTransferTransactionResult = {
    /** Transaction hash */
    hash: string;
    /** Transaction raw data */
    rawTransaction: string;
};

/**
 * Result for transfer sendSponsorTransaction response
 */
export type SendSponsorTransactionResult = {
    /** Transaction hash */
    hash: string;
    /** Transaction status(true: success, false: failed) */
    status: boolean;
};

/**
 * Transfer tx info
 */
export type TransferTx = {
    /** Transfer sender address */
    address: string;
    /** Sender address name */
    addressName: string;
    /** Transfer amount */
    amount: number;
    /** Completion time */
    completeTime: number;
    /** Create time */
    createTime: number;
    /** Transfer currency */
    currency: string;
    /** Sender did */
    did: string;
    /** Transaction hash */
    hash: string;
    /** Sender merchant id */
    merchantId: string;
    /** Sender merchant name */
    merchantName: string;
    /** Sender merchant nickname */
    nickName: string;
    /** Receiver name */
    receiver: string;
    /** Transfer remark */
    remark: string;
    /** Sender name */
    sender: string;
    /** status */
    status: string;
    /** Receiver address */
    toAddress: string;
    /** Receiver address name */
    toAddressName: string;
    /** Receiver did */
    toDid: string;
    /** Receiver merchant id */
    toMerchantId: string;
    /** Receiver merchant name */
    toMerchantName: string;
    /** Receiver merchant nickname */
    toNickName: string;
    /** Transfer type */
    transferMethod: string;
};

/**
 * Result for transfer getTransactions response
 */
export type GetTransactionsResult = {
    /** Page index */
    pageIndex: number;
    /** Page size */
    pageSize: number;
    /** Query data list */
    rows: [TransferTx];
    /** Total page number */
    totalNum: number;
};

/**
 * Result for transfer sendTransferTransaction response
 */
export type SendTransferTransactionResult = {
    /** Transfer tx hash */
    hash: string;
    /** Transfer status:
     * UN_PAY: Payment to be made
     * RUNNING: Transferring
     * SUCCESS: Transfer successful
     * FAIL: Transfer failed
     * CANCEL: Cancelled
     * TIMEOUT: Signature timeout
     *  */
    status: string;
};

/**
 * Result for tx getTransactionsByChain field rows
 */
export type GetTransactionsByChainResultRows = {
    /** Transaction amount */
    amount: string;
    /** Transaction complete time */
    completeTime: number;
    /** Transaction hash */
    hash: string;
    /** Transaction receiver */
    receiver: string;
    /** Transaction sender */
    sender: string;
    /** Transaction symbol */
    symbol: string;
    /** Transaction type */
    txType: string;
};

/**
 * Result for tx getTransactionsByChain response
 */
export type GetTransactionsByChainResult = {
    /** Page index */
    pageIndex: number;
    /** Page size */
    pageSize: number;
    /** Data row list */
    rows: [GetTransactionsByChainResultRows];
    /** Total page number */
    totalNum: number;
};

/**
 * Result for wallet getChainCurrencies field currencyList
 */
export type GetChainCurrenciesResultCurrencyList = {
    /** Currency decimals */
    calculateDecimals: number;
    /** Currency address */
    coinType: string;
    /** Currency code */
    currency: string;
    /** Currency type 1:Fiat 2 Digital */
    currencyType: number;
    /** Display decimals */
    displayDecimals: number;
    /** USD rate */
    exchangeRate: number;
    /** Currency name */
    name: string;
    /** Currency icon */
    pic: string;
    /** Currency symbol */
    symbol: string;
};

/**
 * Result for wallet getChainCurrencies response
 */
export type GetChainCurrenciesResult = {
    /** Chain */
    chain: string;
    /** Currency list*/
    currencyList: [GetChainCurrenciesResultCurrencyList];
};

/**
 * Result for wallet getWalletInfo response
 */
export type GetWalletInfoResult = {
    /** Account number */
    account: string;
    /** Account name */
    accountName: string;
    /** Account address */
    address: string;
    /** Account alias name */
    aliasName: string;
    /** Chain */
    chain: string;
    /** DID */
    did: string;
    /** Account user login number */
    userNo: string;
    /** Account wallet type */
    walletType: string;
};

export class Connection {
    private readonly client: Client;

    constructor(endpoint: string, options: ClientOptions) {
        this.client = new Client(endpoint, options);
    }

    setToken(token: Token): void {
        this.client.setToken(token);
    }
    /**
     * Step 1：Request verification code
     * @param {RequestSmsCodeOptions} options
     * @returns {Promise<string>}
     */
    async requestSmsCode(options: RequestSmsCodeOptions): Promise<string> {
        return await this.client.request(PATHS.REQUEST_SMS_CODE, options);
    }

    /**
     * Step2：Mobile phone number verification
     * @param {AuthenticateSmsOptions} options
     * @returns {Promise<AuthenticateSmsResult>}
     */
    async authenticateSms(
        options: AuthenticateSmsOptions,
    ): Promise<AuthenticateSmsResult> {
        return await this.client.request(PATHS.AUTHENTICATE_SMS, options);
    }

    /**
     * Step3：Get Certification JWT-Token
     * @param {ZkLoginOptions} options
     * @returns {Promise<LoginResult>}
     */
    async zkLogin(options: ZkLoginOptions): Promise<LoginResult> {
        return await this.client.request(PATHS.ZK_LOGIN, options);
    }

    /**
     * Get user information based on token
     * @returns {Promise<LoginResult>}
     */
    async getUser(): Promise<LoginResult> {
        return await this.client.request(PATHS.GET_USER, {});
    }

    /**
     * Get zk proof
     * @param {GetZkProofsOptions} options
     * @returns {Promise<GetZkProofsResult>}
     */
    async getZkProofs(options: GetZkProofsOptions): Promise<GetZkProofsResult> {
        return await this.client.request(PATHS.GET_ZK_PROOFS, options);
    }

    /**
     * Refresh Token
     * @param {RefreshTokenOptions} options
     * @returns {Promise<LoginResult>}
     */
    async refreshToken(options: RefreshTokenOptions): Promise<LoginResult> {
        return await this.client.request(PATHS.REFRESH_TOKEN, options);
    }


    /**
     * Construct any type of gas sponsor transaction
     * @param {BuildSponsorTransactionOptions} options
     * @returns {Promise<BuildSponsorTransactionResult>}
     */
    async buildSponsorTransaction(
        options: BuildSponsorTransactionOptions,
    ): Promise<BuildSponsorTransactionResult> {
        return await this.client.request(PATHS.BUILD_SPONSOR_TRANSACTION, options);
    }

    /**
     * Send gas sponsor transaction
     * @param {SendSponsorTransactionOptions} options
     * @returns {Promise<SendSponsorTransactionResult>}
     */
    async sendSponsorTransaction(
        options: SendSponsorTransactionOptions,
    ): Promise<SendSponsorTransactionResult> {
        return await this.client.request(PATHS.SEND_SPONSOR_TRANSACTION, options);
    }

    /**
     * Constructing a transfer transaction
     * @param {BuildTransferTransactionOptions} options
     * @returns {Promise<BuildTransferTransactionResult>}
     */
    async buildTransferTransaction(
        options: BuildTransferTransactionOptions,
    ): Promise<BuildTransferTransactionResult> {
        return await this.client.request(PATHS.BUILD_TRANSFER_TRANSACTION, options);
    }

    /**
     * Send and execute transfer transaction
     * @param {SendTransferTransactionOptions} options
     * @returns {Promise<SendTransferTransactionResult>}
     */
    async sendTransferTransaction(
        options: SendTransferTransactionOptions,
    ): Promise<SendTransferTransactionResult> {
        return await this.client.request(PATHS.SEND_TRANSFER_TRANSACTION, options);
    }

    /**
     * Query Transfer Transaction
     * @param {GetTransactionOptions} options
     * @returns {Promise<TransferTx>}
     */
    async getTransaction(
        options: GetTransactionOptions,
    ): Promise<TransferTx> {
        return await this.client.request(PATHS.GET_TRANSACTION, options);
    }

    /**
     * Pagination-Query Transfer Transaction
     * @param {GetTransactionsOptions} options
     * @returns {Promise<GetTransactionsResult>}
     */
    async getTransactions(
        options: GetTransactionsOptions,
    ): Promise<GetTransactionsResult> {
        return await this.client.request(PATHS.GET_TRANSACTIONS, options);
    }


    /**
     * Query transactions based on address chain
     * @param {GetTransactionsByChainOptions} options
     * @returns {Promise<GetTransactionsByChainResult>}
     */
    async getTransactionsByChain(
        options: GetTransactionsByChainOptions,
    ): Promise<GetTransactionsByChainResult> {
        return await this.client.request(PATHS.GET_TRANSACTIONS_BY_CHAIN, options);
    }

    /**
     * Get information about the currencies supported by the chain and the exchange rate with USD
     * @returns {Promise<[GetChainCurrenciesResult]>}
     */
    async getChainCurrencies(): Promise<[GetChainCurrenciesResult]> {
        return await this.client.request(PATHS.GET_CHAIN_CURRENCIES, {});
    }

    /**
     * Query basic wallet information
     * @param {GetWalletInfoOptions} options
     * @returns {Promise<[GetWalletInfoResult]>}
     */
    async getWalletInfo(
        options: GetWalletInfoOptions,
    ): Promise<[GetWalletInfoResult]> {
        return await this.client.request(PATHS.GET_WALLET_INFO, options);
    }
}
