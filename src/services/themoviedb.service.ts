import { ApiService, UrlParams } from './api.service';
import { random } from 'lodash';
import { Result, DiscoverMovieResponse, DiscoverMovieResponseItem, IdNameMap, MovieDetailResponse, Preference } from './../models';

const GENRE_ID_TO_NAME_MAP = [
  {
    id: 28,
    name: 'Action'
  },
  {
    id: 12,
    name: 'Adventure'
  },
  {
    id: 16,
    name: 'Animation'
  },
  {
    id: 35,
    name: 'Comedy'
  },
  {
    id: 80,
    name: 'Crime'
  },
  {
    id: 99,
    name: 'Documentary'
  },
  {
    id: 18,
    name: 'Drama'
  },
  {
    id: 10751,
    name: 'Family'
  },
  {
    id: 14,
    name: 'Fantasy'
  },
  {
    id: 36,
    name: 'History'
  },
  {
    id: 27,
    name: 'Horror'
  },
  {
    id: 10402,
    name: 'Music'
  },
  {
    id: 9648,
    name: 'Mystery'
  },
  {
    id: 10749,
    name: 'Romance'
  },
  {
    id: 878,
    name: 'Science Fiction'
  },
  {
    id: 10770,
    name: 'TV Movie'
  },
  {
    id: 53,
    name: 'Thriller'
  },
  {
    id: 10752,
    name: 'War'
  },
  {
    id: 37,
    name: 'Western'
  }
];
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

  async getRandomMovie(preferences?: Preference[]): Promise<Result<DiscoverMovieResponseItem>> {
    const path = 'discover/movie';
    const reqParams: UrlParams = {
      language: 'en-US',
      'vote_average.gte': 5.5,
      'vote_count.gte': 20,
      'release_date.gte': '1990-01-01',
      sort_by: 'vote_average.desc',
      api_key: this.token
    };

    // console.log('preferences', preferences);
    if (preferences && preferences.length > 0) {
      for (const preference of preferences) {
        switch (preference.filter) {
          case 'genre':
            const genreNamesArr = preference.values;
            const genreIds = [];
            for (const genre of genreNamesArr) {
              const foundGenreId = GENRE_ID_TO_NAME_MAP.find(g => g.name.toLowerCase() === genre.toLowerCase());
              if (foundGenreId) {
                genreIds.push(foundGenreId.id);
              }
            }

            switch (preference.matchType) {
              case 'any':
                reqParams['with_genres'] = ('undefined' !== typeof reqParams['with_genres']) ? `${reqParams['with_genres']},${genreIds.join('|')}` : genreIds.join('|');
                break;
              case 'all':
                reqParams['with_genres'] = genreIds.join(',');
                break;
              case 'any!':
                reqParams['without_genres'] = genreIds.join('|');
                break;
              case 'all!':
                reqParams['without_genres'] = genreIds.join(',');
                break;
              default:
                reqParams['with_genres'] = genreIds.join('|');
            }
            break;
          default:
        }
      }
    }

    let result: Result<DiscoverMovieResponseItem>;

    try {
      // * Since we cannot request a random *existing* page or increase per page number of results, we should first see how many pages there available, then make another call with random page withing available range
      const firstResponseRaw: DiscoverMovieResponse = await this.apiService.fetchUrl(`${this.host}${path}`, reqParams);
      const page = random(1, firstResponseRaw.total_pages);

      reqParams['page'] = page;

      const responseRaw: DiscoverMovieResponse = await this.apiService.fetchUrl(`${this.host}${path}`, reqParams);
      const response: DiscoverMovieResponseItem[] = responseRaw.results;
      const index = random(0, response.length);
      // console.log('themoviedbservice response', response);

      if (Array.isArray(response)) {
        if (response.length > 0) {
          const movie: DiscoverMovieResponseItem = response[index];

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
