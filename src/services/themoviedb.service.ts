import fetch, { RequestInit } from 'node-fetch';
import { ApiService, UrlParams } from './api.service';
import { random } from 'lodash';
import { Result, DiscoverMovieResponse, DiscoverMovieResponseItem, IdNameMap, MovieDetailResponse } from './../models';

export class TheMovieDBService {

  private apiService: ApiService;

  private host: string;
  private token: string;

  constructor() {
    this.apiService = new ApiService();

    this.host = 'https://api.themoviedb.org/3/';
    this.token = process.env.THEMOVIEDB_TOKEN;
  }

  async getGenreNamesByIds(ids: number[]): Promise<Result<string[]>> {
    const path = 'genre/movie/list';
    const reqParams: UrlParams = {
      language: 'en-US',
      api_key: this.token
    };

    let result: Result<string[]>;

    try {
      const responseRaw: { genres: IdNameMap[] } = await this.apiService.fetchUrl(`${this.host}${path}`, reqParams);
      const response: IdNameMap[] = responseRaw.genres;
      // console.log('getGenreNamesByIds response', response);

      const genresRaw: IdNameMap[] = [];

      for (const id of ids) {
        genresRaw.push(response.find(genre => genre.id === id));
      }

      const genres = genresRaw.map(genre => genre.name);

      // console.log('getGenreNamesByIds gernes', genres);

      result = {
        success: true,
        data: genres
      };
    } catch (error) {
      console.log('Fetch error', error);
      result = {
        success: false,
        error: `Fetch error: ${error}`,
        message: `Unable to complete fetch with: ${this.host}${path} and ${reqParams}`
      };
    }

    return result;
  }

  async getMovieDetails(id: number, appendVideos = false): Promise<Result<MovieDetailResponse>> {
    const path = `movie/${id}`;
    const reqParams: UrlParams = {
      language: 'en-US',
      api_key: this.token
    };
    if (appendVideos) {
      reqParams['append_to_response'] = 'videos';
    }

    let result: Result<MovieDetailResponse>;

    try {
      const response = await this.apiService.fetchUrl(`${this.host}${path}`, reqParams);

      result = {
        success: true,
        data: response
      };
    } catch (error) {
      console.log('Fetch error', error);
      result = {
        success: false,
        error: `Fetch error: ${error}`,
        message: `Unable to complete fetch with: ${this.host}${path} and ${reqParams}`
      };
    }

    return result;
  }

  async getRandomMovie(options?: any): Promise<Result<DiscoverMovieResponseItem>> {
    const path = 'discover/movie';
    const page = random(1, 400);
    const index = random(0, 19);
    const reqParams: UrlParams = {
      language: 'en-US',
      'vote_average.gte': 5.5,
      'vote_count.gte': 20,
      'release_date.gte': '1990-01-01',
      sort_by: 'vote_average.desc',
      page,
      api_key: this.token
    };

    let result: Result<DiscoverMovieResponseItem>;

    try {
      const responseRaw: DiscoverMovieResponse = await this.apiService.fetchUrl(`${this.host}${path}`, reqParams);
      const response: DiscoverMovieResponseItem[] = responseRaw.results;
      // console.log('themoviedbservice response', response);

      if (Array.isArray(response)) {
        if (response.length > 0) {
          let movie: DiscoverMovieResponseItem = response[index];

          if (!movie) {
            movie = response[0];
          }

          result = {
            success: true,
            data: movie
          };
          // console.log('themoviedbservice result', result);
        } else {
          console.log('No movies found with such request:', `${this.host}${path}`);
          result = {
            success: false,
            error: `No movies found with such request: ${this.host}${path}`
          };
        }
      } else {
        result = {
          success: false,
          error: `Invalid response from server: ${response}`
        };
        throw new Error(`Invalid response from server: ${response}`);
      }

    } catch (error) {
      console.log('Fetch error', error);
      result = {
        success: false,
        error: `Fetch error: ${error}`,
        message: `Unable to complete fetch with: ${this.host}${path} and ${reqParams}`
      };
    }

    return result;
  }

}
