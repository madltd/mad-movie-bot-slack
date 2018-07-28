export interface DiscoverMovieResponse {
  page: number;
  total_results: number;
  total_pages: number;
  results: DiscoverMovieResponseItem[];
}

export interface DiscoverMovieResponseItem {
  vote_count: number;
  id: number;
  video: boolean;
  vote_average: number;
  title: string;
  popularity: number;
  poster_path: string;
  original_language: string;
  original_title: string;
  genre_ids: number[];
  backdrop_path?: string;
  adult: boolean;
  overview: string;
  release_date: string;
}

export interface Result<T> {
  success: boolean;
  data?: T;
  error?: any;
  message?: string;
}

export interface IdNameMap {
  id: number;
  name: string;
}

export interface MovieDetailResponse {
  adult: boolean;
  backdrop_path: string;
  belongs_to_collection: null;
  budget: number;
  genres: Genre[];
  homepage: string;
  id: number;
  imdb_id: string;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: null;
  production_companies: ProductionCompany[];
  production_countries: ProductionCountry[];
  release_date: string;
  revenue: number;
  runtime: number;
  spoken_languages: SpokenLanguage[];
  status: string;
  tagline: string;
  title: string;
  video: boolean;
  videos?: { results: MovieDetailVideo[] };
  vote_average: number;
  vote_count: number;
}

export interface MovieDetailVideo {
  id: string;
  iso_639_1?: string;
  iso_3166_1?: string;
  key: string;
  name: string;
  site: string;
  size: number;
  type: string;
}

export interface Genre {
  id: number;
  name: string;
}

export interface ProductionCompany {
  id: number;
  logo_path: null | string;
  name: string;
  origin_country: string;
}

export interface ProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface SpokenLanguage {
  iso_639_1: string;
  name: string;
}

export interface TeamIdTokenMap {
  team_id: string;
  access_token: string;
}
