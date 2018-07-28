import * as cheerio from 'cheerio';
import { ApiService, UrlParams } from './../services/api.service';

export class CheerioService {

  private apiService: ApiService;

  constructor() {
    this.apiService = new ApiService();
  }

  async getValueBySelector(selectors: string[], url: string, urlParams?: UrlParams): Promise<string[]> {
    const html = await this.apiService.fetchUrl(url, urlParams, undefined, false);
    const $ = cheerio.load(html as string);
    const result: string[] = [];
    for (const selector of selectors) {
      result.push($(selector).html());
    }
    // console.log('getValueBySelector result', result);
    return result;
  }

}
