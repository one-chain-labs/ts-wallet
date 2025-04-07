const _          = require("lodash");
const Path       = require("path");
const fs         = require("fs");
const $RefParser = require("@apidevtools/json-schema-ref-parser");
const axios      = require("axios");

const checkFile = (filePath) => {
    const dirname = Path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return;
    }
    checkFile(dirname);
    fs.mkdirSync(dirname, {recursive: true});
};

let PATH_METHODS     = {
    "/did/sendCode":            "requestSmsCode",
    "/did/authenticateSms":     "authenticateSms",
    "/did/getToken":            "zkLogin",
    "/did/getZkProofs":         "getZkProofs",
    "/did/refreshJwtToken":     "refreshToken",
    "/did/getTokenUserProfile": "getUser",

    "/transfer/buildSponsorTransaction": "buildSponsorTransaction",
    "/transfer/doProxyPayTx":            "sendSponsorTransaction",
    "/transfer/createOrder":             "buildTransferTransaction",
    "/transfer/sendTx":                  "sendTransferTransaction",
    "/transfer/queryOrder":              "getTransaction",
    "/transfer/pageList":                "getTransactions",
    "/tx/queryTx":                       "getTransactionsByChain",

    "/wallet/queryChainCurrencyForList": "getChainCurrencies",
    "/wallet/queryUserWalletForList":    "getWalletInfo",

};
const loadingSchemas = async () => {
    let response = await axios.get("http://hchain-api-server-svc.dev.svc.cluster.local:8080/v2/api-docs?group=app");
    if (!response || !response.data) {
        return console.error("Load swagger error.");
    }
    let swagger = await $RefParser.dereference(response.data);
    let schemas = {};
    _.each(_.uniq(_.map(_.keys(swagger.paths), (path) => _.first(_.slice(path.split("/"), 1)))), (tag) => schemas[tag] = []);
    _.each(swagger.paths, (v, k) => {
        const paths     = _.slice(k.split("/"), 1);
        let pathPrefix  = _.first(paths);
        let pathSuffix  = _.slice(paths, 1).join(" ");
        let _pathSuffix = PATH_METHODS[k] ? _.snakeCase(PATH_METHODS[k]) : _.snakeCase(pathSuffix);
        let method      = PATH_METHODS[k] ? PATH_METHODS[k] : _.camelCase(_.slice(paths, 1).join(" "));
        let parameter   = _.find(v.post.parameters, {in: "body"});
        let request     = parameter ? parameter.schema : {};
        let result      = v.post.responses["200"].schema;
        schemas[pathPrefix].push({
            key:         _pathSuffix.toUpperCase(),
            method:      method,
            path:        k,
            description: v.post.summary,
            parameters:  request,
            responses:   result,
        });
    });
    console.log("Loading schemas done.");
    return schemas;
};

const generateJsCode = (schemas, basePath) => {
    let path       = Path.join(process.env.PWD, basePath);
    const omitKeys = ["timestamp", "merchantId", "merchantSign"];
    _.each(schemas, (_schemas, key) => {
        let _pathFile = Path.join(path, key, "constants.js");
        checkFile(_pathFile);

        let classFile = Path.join(path, key, "index.js");
        checkFile(classFile);
        let constants = {PATH: {}};

        let className    = _.upperFirst(key);
        let classContext = `const {PATH} = require("./constants");\nclass ${className} {\n\tconstructor(client) {\n\t\tthis.client = client;\n\t}\n`;


        let pathContext = `module.exports = {\n\tPATH:{\n`;
        _.each(_schemas, (doc) => {
            if (doc.path === "/did/getToken") {
                console.log(JSON.stringify(doc, null, 4));
            }
            constants.PATH[doc.key] = doc.path;
            pathContext += `\t\t${doc.key}: "${doc.path}",\n`;
            let remark              = `\t/**\n\t* @description ${doc.description}\n\t* @param {object} options\n`;
            if (doc.parameters) {
                _.each(_.omit(doc.parameters.properties, omitKeys), (v, k) => {
                    remark += `\t* @param {${v.type === "integer" ? "number" : v.type}} ${v.allowEmptyValue ? `[options.${k}]` : `options.${k}`} ${v.description || ""}\n`;
                });
            }


            remark += `\t* @returns {Promise<*>}\n\t*/\n`;
            classContext += remark;
            classContext += `\tasync ${doc.method}(options) {\n`;
            classContext += `\t\treturn await this.client.request(PATH.${doc.key}, {\n`;

            if (doc.parameters) {
                _.each(_.omit(doc.parameters.properties, omitKeys), (v, k) => {
                    classContext += `\t\t\t${k}: options.${k},\n`;
                });
            }

            classContext += `\t\t});\n`;
            classContext += `\t}\n`;
            // console.log(doc.path, JSON.stringify(doc.responses, null, 4))

        });
        classContext += `}\n\nmodule.exports = ${className};`;
        pathContext += `\t}\n\}`;
        // fs.writeFileSync(_pathFile, pathContext, "utf8");
        // fs.writeFileSync(classFile, classContext, "utf8");
    });
};

const omitPtah       = ["/otc/payment/method/upload/file"];
const generateTsCode = (schemas, basePath) => {
    if (!schemas) {
        return console.log("Not find schemas");
    }
    let path       = Path.join(process.env.PWD, basePath);
    // const omitKeys = ["timestamp", "merchantId", "merchantSign"];
    const omitKeys = [];
    _.each(schemas, (_schemas, key) => {
        let _pathFile = Path.join(path, key, "constants.ts");
        checkFile(_pathFile);

        let classFile = Path.join(path, key, "index.ts");
        checkFile(classFile);
        let constants = {PATH: {}};

        let className         = _.upperFirst(key);
        // let classContext      = `const {PATH} = require("./constants");\nimport {Client} from "../client";\n\n`;
        let classContext      = `import {Client} from "../client";\n`;
        let pathKey           = [_.upperCase(key), "PATH"].join("_");
        let pathContext       = `export const ${pathKey} = {\n`;
        let functionsContext  = [];
        let reqOptionsContext = [];
        let resOptionsContext = [];

        _.each(_schemas, (doc) => {
            if (_.includes(omitPtah, doc.path)) {
                return;
            }
            constants.PATH[doc.key] = doc.path;
            pathContext += `\t${doc.key}: "${doc.path}",\n`;

            let reqOptionsKey       = `${_.upperFirst(key)}${_.upperFirst(doc.method)}Options`;
            let resOptionsKey       = `${_.upperFirst(key)}${_.upperFirst(doc.method)}Result`;
            let requestTypeContext  = `\n/**\n* Options for ${key} ${doc.method} request\n*/\nexport type ${reqOptionsKey} = {\n`;
            let responseTypeContext = `\n/**\n* Result for ${key} ${doc.method} response\n*/\nexport type ${resOptionsKey} = {\n`;

            let returnType = doc.responses.type;
            if (doc.responses.type === "object") {
                returnType = resOptionsKey;

            }
            if (doc.responses.type === "array") {
                returnType = `[${resOptionsKey}]`;
            }

            let funContext = `\t/**\n\t* ${doc.description}\n\t* @param {${reqOptionsKey}} options\n`;
            funContext += `\t* @returns {Promise<${returnType}>}\n\t*/\n`;
            funContext += `\tasync ${doc.method}(options: ${reqOptionsKey}): Promise<${returnType}> {\n`;
            // funContext += `\t\treturn await this.client.request(${pathKey}.${doc.key}, {\n`;

            if (doc.parameters) {
                _.each(_.omit(doc.parameters.properties, omitKeys), (v, k) => {
                    // funContext += `\t\t\t${k}: options.${k},\n`;
                    let type = v.type === "integer" ? "number" : v.type;
                    requestTypeContext += v.description ? `\t/** ${v.description} */\n` : ``;
                    if (v.type === "array") {
                        type = `[${v.items.type}]`;
                    }
                    if (_.includes(doc.parameters.required, k)) {
                        requestTypeContext += `\t${k}: ${type};\n`;
                    } else {
                        requestTypeContext += `\t${k}?: ${type};\n`;
                    }
                });
            }
            requestTypeContext += `}\n`;
            funContext += `\t\treturn await this.client.request(${pathKey}.${doc.key}, options);\n`;


            if (doc.responses) {
                if (doc.responses.type === "object") {
                    _.each(doc.responses.properties, (pvalue, pkey) => {
                        responseTypeContext += pvalue.description ? `\t/** ${pvalue.description} */\n` : ``;
                        if (pvalue.type === "object") {
                            let childTypeKey     = resOptionsKey + _.upperFirst(pkey);
                            let childTypeContext = `\n/**\n* Result for ${key} ${doc.method} field ${pkey}\n*/\nexport type ${childTypeKey} = {\n`;
                            _.each(pvalue.properties, (ppvalue, ppkey) => {
                                let type = ppvalue.type === "integer" ? "number" : ppvalue.type;
                                childTypeContext += ppvalue.description ? `\t/** ${ppvalue.description} */\n` : ``;
                                childTypeContext += `\t${ppkey}: ${ppvalue.allowEmptyValue ? `?${type}` : type};\n`;
                            });
                            childTypeContext += `}\n`;
                            responseTypeContext += `\t${pkey}: ${pvalue.allowEmptyValue ? `?${childTypeKey}` : childTypeKey};\n`;
                            resOptionsContext.push(childTypeContext);
                        } else if (pvalue.type === "array" && pvalue.items) {
                            if (pvalue.items.type === "object") {
                                let childTypeKey     = resOptionsKey + _.upperFirst(pkey);
                                let childTypeContext = `\n/**\n* Result for ${key} ${doc.method} field ${pkey}\n*/\nexport type ${childTypeKey} = {\n`;
                                _.each(pvalue.items.properties, (ppvalue, ppkey) => {
                                    let type = ppvalue.type === "integer" ? "number" : ppvalue.type;
                                    childTypeContext += ppvalue.description ? `\t/** ${ppvalue.description} */\n` : ``;
                                    childTypeContext += `\t${ppkey}: ${ppvalue.allowEmptyValue ? `?${type}` : type};\n`;
                                });

                                childTypeContext += `}\n`;
                                responseTypeContext += `\t${pkey}: [${childTypeKey}];\n`;
                                resOptionsContext.push(childTypeContext);
                            } else {
                                responseTypeContext += `\t${pkey}: [${pvalue.items.type}];\n`;
                            }
                        } else {
                            let type = pvalue.type === "integer" ? "number" : pvalue.type;
                            responseTypeContext += `\t${pkey}: ${pvalue.allowEmptyValue ? `?${type}` : type};\n`;
                        }
                    });
                }
                if (doc.responses.type === "array" && doc.responses.items) {
                    _.each(doc.responses.items.properties, (pvalue, pkey) => {
                        let type = pvalue.type === "integer" ? "number" : pvalue.type;
                        responseTypeContext += pvalue.description ? `\t/** ${pvalue.description} */\n` : ``;
                        responseTypeContext += `\t${pkey}: ${pvalue.allowEmptyValue ? `?${type}` : type};\n`;
                    });
                }
            }

            // funContext += `\t\t});\n`;
            funContext += `\t}\n`;
            responseTypeContext += `}\n`;
            reqOptionsContext.push(requestTypeContext);
            resOptionsContext.push(responseTypeContext);
            functionsContext.push(funContext);

        });
        pathContext += `}\n`;
        classContext += pathContext;
        classContext += `${reqOptionsContext.join("\n")}`;
        classContext += `${resOptionsContext.join("\n")}`;
        classContext += `\nexport class ${className} {\n\tprivate readonly client: Client;\n\tconstructor(client: Client) {\n\t\tthis.client = client;\n\t}\n`;
        classContext += `${functionsContext.join("\n")}`;
        classContext += `}\n\n`;

        fs.writeFileSync(classFile, classContext, "utf8");
        console.log(`Generate module ${key} code done........`);
    });
};

const generateTsCode2 = (schemas, basePath) => {
    if (!schemas) {
        return console.log("Not find schemas");
    }
    let path       = Path.join(process.env.PWD, basePath);
    // const omitKeys = ["timestamp", "merchantId", "merchantSign"];
    const omitKeys = [];
    let classFile  = Path.join(path, "connection.ts");
    // let _pathFile = Path.join(path, key, "constants.ts");
    // checkFile(_pathFile);
    let constants = {PATH: {}};
    checkFile(classFile);
    let classContext      = `import {Client, ClientOptions, Token} from "./client";\n`;
    let pathContext       = `export const PATHS = {\n`;
    let functionsContext  = [];
    let reqOptionsContext = [];
    let resOptionsContext = [];
    _.each(schemas, (_schemas, key) => {
        _.each(_schemas, (doc) => {
            // return console.log(_.pick(doc, ["key", "method", "path"]));
            if (_.includes(omitPtah, doc.path)) {
                return;
            }
            constants.PATH[doc.key] = doc.path;
            pathContext += `\t${doc.key}: "${doc.path}",\n`;

            // let reqOptionsKey       = `${_.upperFirst(key)}${_.upperFirst(doc.method)}Options`;
            // let resOptionsKey       = `${_.upperFirst(key)}${_.upperFirst(doc.method)}Result`;
            let reqOptionsKey       = `${_.upperFirst(doc.method)}Options`;
            let resOptionsKey       = `${_.upperFirst(doc.method)}Result`;
            let requestTypeContext  = `\n/**\n* Options for ${key} ${doc.method} request\n*/\nexport type ${reqOptionsKey} = {\n`;
            let responseTypeContext = `\n/**\n* Result for ${key} ${doc.method} response\n*/\nexport type ${resOptionsKey} = {\n`;

            let returnType = doc.responses.type;
            if (doc.responses.type === "object") {
                returnType = resOptionsKey;

            }
            if (doc.responses.type === "array") {
                returnType = `[${resOptionsKey}]`;
            }

            let funContext = `\t/**\n\t* ${doc.description}\n\t* @param {${reqOptionsKey}} options\n`;
            funContext += `\t* @returns {Promise<${returnType}>}\n\t*/\n`;
            funContext += `\tasync ${doc.method}(options: ${reqOptionsKey}): Promise<${returnType}> {\n`;

            if (doc.parameters) {
                _.each(_.omit(doc.parameters.properties, omitKeys), (v, k) => {
                    // funContext += `\t\t\t${k}: options.${k},\n`;
                    let type = v.type === "integer" ? "number" : v.type;
                    requestTypeContext += v.description ? `\t/** ${v.description} */\n` : ``;
                    if (v.type === "array") {
                        type = `[${v.items.type}]`;
                    }
                    if (_.includes(doc.parameters.required, k)) {
                        requestTypeContext += `\t${k}: ${type};\n`;
                    } else {
                        requestTypeContext += `\t${k}?: ${type};\n`;
                    }
                });
            }
            requestTypeContext += `}\n`;
            funContext += `\t\treturn await this.client.request(PATHS.${doc.key}, options);\n`;


            if (doc.responses) {
                if (doc.responses.type === "object") {
                    _.each(doc.responses.properties, (pvalue, pkey) => {
                        responseTypeContext += pvalue.description ? `\t/** ${pvalue.description} */\n` : ``;
                        if (pvalue.type === "object") {
                            let childTypeKey     = resOptionsKey + _.upperFirst(pkey);
                            let childTypeContext = `\n/**\n* Result for ${key} ${doc.method} field ${pkey}\n*/\nexport type ${childTypeKey} = {\n`;
                            _.each(pvalue.properties, (ppvalue, ppkey) => {
                                let type = ppvalue.type === "integer" ? "number" : ppvalue.type;
                                childTypeContext += ppvalue.description ? `\t/** ${ppvalue.description} */\n` : ``;
                                childTypeContext += `\t${ppkey}: ${ppvalue.allowEmptyValue ? `?${type}` : type};\n`;
                            });
                            childTypeContext += `}\n`;
                            responseTypeContext += `\t${pkey}: ${pvalue.allowEmptyValue ? `?${childTypeKey}` : childTypeKey};\n`;
                            resOptionsContext.push(childTypeContext);
                        } else if (pvalue.type === "array" && pvalue.items) {
                            if (pvalue.items.type === "object") {
                                let childTypeKey     = resOptionsKey + _.upperFirst(pkey);
                                let childTypeContext = `\n/**\n* Result for ${key} ${doc.method} field ${pkey}\n*/\nexport type ${childTypeKey} = {\n`;
                                _.each(pvalue.items.properties, (ppvalue, ppkey) => {
                                    let type = ppvalue.type === "integer" ? "number" : ppvalue.type;
                                    childTypeContext += ppvalue.description ? `\t/** ${ppvalue.description} */\n` : ``;
                                    childTypeContext += `\t${ppkey}: ${ppvalue.allowEmptyValue ? `?${type}` : type};\n`;
                                });

                                childTypeContext += `}\n`;
                                responseTypeContext += `\t${pkey}: [${childTypeKey}];\n`;
                                resOptionsContext.push(childTypeContext);
                            } else {
                                responseTypeContext += `\t${pkey}: [${pvalue.items.type}];\n`;
                            }
                        } else {
                            let type = pvalue.type === "integer" ? "number" : pvalue.type;
                            responseTypeContext += `\t${pkey}: ${pvalue.allowEmptyValue ? `?${type}` : type};\n`;
                        }
                    });
                }
                if (doc.responses.type === "array" && doc.responses.items) {
                    _.each(doc.responses.items.properties, (pvalue, pkey) => {


                        if (pvalue.type === "array" && pvalue.items) {
                            if (pvalue.items.type === "object") {
                                let childTypeKey     = resOptionsKey + _.upperFirst(pkey);
                                let childTypeContext = `\n/**\n* Result for ${key} ${doc.method} field ${pkey}\n*/\nexport type ${childTypeKey} = {\n`;
                                _.each(pvalue.items.properties, (ppvalue, ppkey) => {
                                    let type = ppvalue.type === "integer" ? "number" : ppvalue.type;
                                    childTypeContext += ppvalue.description ? `\t/** ${ppvalue.description} */\n` : ``;
                                    childTypeContext += `\t${ppkey}: ${ppvalue.allowEmptyValue ? `?${type}` : type};\n`;
                                });

                                childTypeContext += `}\n`;
                                responseTypeContext += `\t${pkey}: [${childTypeKey}];\n`;
                                resOptionsContext.push(childTypeContext);
                            } else {
                                responseTypeContext += `\t${pkey}: [${pvalue.items.type}];\n`;
                            }
                        } else {
                            let type = pvalue.type === "integer" ? "number" : pvalue.type;
                            responseTypeContext += pvalue.description ? `\t/** ${pvalue.description} */\n` : ``;
                            responseTypeContext += `\t${pkey}: ${pvalue.allowEmptyValue ? `?${type}` : type};\n`;
                        }
                    });
                }
            }

            // funContext += `\t\t});\n`;
            funContext += `\t}\n`;
            responseTypeContext += `}\n`;
            reqOptionsContext.push(requestTypeContext);
            resOptionsContext.push(responseTypeContext);
            functionsContext.push(funContext);

        });


    });
    pathContext += `}\n`;
    classContext += pathContext;
    classContext += `${reqOptionsContext.join("\n")}`;
    classContext += `${resOptionsContext.join("\n")}`;
    classContext += `\nexport class Connection {\n\tprivate readonly client: Client;\n\t constructor(endpoint: string, options: ClientOptions) {\n\t\t this.client = new Client(endpoint, options);\n\t}\n\tsetToken(token: Token): void {\n\t\tthis.client.setToken(token);\n\t}\n`;
    classContext += `${functionsContext.join("\n")}`;
    classContext += `}\n\n`;
    fs.writeFileSync(classFile, classContext, "utf8");
    console.log(`Generate module connection code done........`);
};

(async () => {
    let schemas = await loadingSchemas();
    generateTsCode2(schemas, "src");
})();
