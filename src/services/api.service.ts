import fetch, { RequestInit, Response } from 'node-fetch';

export interface UrlParams {
  [x: string]: string | number;
}

export class ApiService {

  private opts: RequestInit;

  constructor() {
    this.opts = {
      method: 'GET'
    };
  }

  isUrl(url: string): boolean {
    const urlRegex = new RegExp('^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$', 'gi');
    return urlRegex.test(url);
  }

  async fetchUrl(url: string, params?: UrlParams, opts?: RequestInit, asJson = true): Promise<any> {

    if (!this.isUrl(url.toString())) {
      throw new Error(`Non URL value: ${url}`);
      // console.log(`Non URL value: ${url}`);
    }

    if (opts) {
      this.opts = { ...this.opts, ...opts };
    }

    const paramsStr = this.stringifyParams(params);

    let unparsedResponse: Response;
    let parsedResponse: JSON | object;

    try {
      console.log('url:', `${url}${paramsStr.length > 0 ? '?' : ''}${paramsStr}`);
      unparsedResponse = await fetch(`${url}${paramsStr.length > 0 ? '?' : ''}${paramsStr}`, this.opts);
      parsedResponse = asJson ? await unparsedResponse.json() : await unparsedResponse.text();
    } catch (error) {
      parsedResponse = { error };
      throw new Error(`Fetch or parse error: ${error}`);
    }

    // console.log('parsedResponse', parsedResponse);

    return parsedResponse;
  }

  private stringifyParams(params: UrlParams): string {
    let paramsStr = '';

    if (params !== undefined && params !== null) {
      Object.keys(params).forEach((param, index, array) => {
        paramsStr += `${param}=${params[param]}`;
        if (index !== array.length - 1) {
          paramsStr += '&';
        }
      });
    }

    return paramsStr;
  }
}
