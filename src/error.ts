export type OneChainResponse = {
  code: string;
  data?: any;
  msg: string;
  success: boolean;
  systemTime: number;
  traceId: string;
};

export class OneChainQuestError extends Error {
  code: string | unknown;
  data: OneChainResponse;

  constructor(res: OneChainResponse, customMessage?: string) {
    super(customMessage != null ? `${customMessage}: ${res.msg}` : res.msg);
    this.code = res.code;
    this.data = res;
    this.name = 'OneChainQuestError';
  }
}
