import axios, {AxiosInstance} from 'axios';
import {uuid} from './utils';
import {HTTP_CONNECTION} from './constants';
import {OneChainQuestError} from './error';

export type ClientOptions = {
  /**
   * Http response timeout
   */
  timeout?: number;

  /**
   * Token
   */
  token?: Token;
};

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type Token = {
  ACCESS_TOKEN: string;
};

function isSuccess(response: any) {
  return response.data.code === HTTP_CONNECTION.SUCCESS_CODE;
}

export class Client {
  private token?: Token;
  private readonly provider: AxiosInstance;

  constructor(endpoint: string, options: ClientOptions) {
    !!options.token && (this.token = options.token);
    this.provider = axios.create({
      baseURL: endpoint,
      timeout: options.timeout || HTTP_CONNECTION.TIMEOUT,
      headers: HTTP_CONNECTION.HEADERS,
    });
  }

  setToken(token: Token): void {
    this.token = token;
  }

  async request(
    url: string,
    data: object,
    method?: HttpMethod,
    headers?: object,
    timeout?: number,
  ) {
    timeout && (this.provider.defaults.timeout = timeout);
    headers && Object.assign(this.provider.defaults.headers, headers);
    !!this.token && Object.assign(this.provider.defaults.headers, this.token);
    this.provider.defaults.headers['X-B3-Traceid'] = uuid();
    let options = {
      url: url,
      data: data,
      method: method || 'POST',
    };
    const response = await this.provider.request(options);
    if (!isSuccess(response)) {
      throw new OneChainQuestError(
        Object.assign({}, response.data, {path: url}),
      );
    }
    return response.data.data;
  }
}
