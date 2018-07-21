import { Request, Response, NextFunction } from 'express';
import { SlackService } from './../services/slack.service';
import { TheMovieDBService } from './../services/themoviedb.service';
import { DiscoverMovieResponseItem, MovieDetailResponse } from '../models';
import * as moment from 'moment';

interface SlashCommandResponse {
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  response_url: string;
  trigger_id: string;
}

class CommandsController {

  private slackService: SlackService;
  private themoviedbService: TheMovieDBService;

  constructor() {
    this.slackService = new SlackService();
    this.themoviedbService = new TheMovieDBService();
  }

  async handleIndex(req: Request, res: Response, next?: NextFunction) {
    res.status(202).writeContinue();
    const slackResponse: SlashCommandResponse = req.body;

    let movie: DiscoverMovieResponseItem;
    let genres: string[];
    let movieDetails: MovieDetailResponse;

    const tempMess = await this.slackService.webClient.chat.postEphemeral({
      channel: req.body.channel_id,
      text: 'Fetching a mad movie for you...',
      user: slackResponse.user_id
    });

    try {
      const movieRaw = await this.themoviedbService.getRandomMovie();

      if (movieRaw.success) {
        movie = movieRaw.data;
      } else {
        console.log('Error in getting a movie from the api. See log above.');
        // TODO: restries?
      }

    } catch (error) {
      console.log('Error calling getRandomMovie() in CommandsController');
      throw new Error(error);
    }

    if (movie) {
      try {
        const genresRaw = await this.themoviedbService.getGenreNamesByIds(movie.genre_ids);

        if (genresRaw.success) {
          genres = genresRaw.data;
        } else {
          genres = ['unknown'];
        }
      } catch (error) {
        console.log(`Error calling getGenreNamesByIds(${movie.genre_ids}) in CommandsController`);
        throw new Error(error);
      }

      try {
        const movieDetailsRaw = await this.themoviedbService.getMovieDetails(movie.id);

        if (movieDetailsRaw.success) {
          movieDetails = movieDetailsRaw.data;
        }
      } catch (error) {
        console.log(`Error calling getMovieDetails(${movie.id}) in CommandsController`);
        throw new Error(error);
      }
    }

    try {
      const result = await this.slackService.webClient.chat.postMessage({
        channel: slackResponse.channel_id,
        text: `https://www.imdb.com/title/${movieDetails.imdb_id}`,
        parse: 'full',
        // text: `*${slackResponse.command}* ${slackResponse.text}`,
        mrkdwn: true,
        attachments: [
          {
            fallback: `This is a fallback, something failed in sending full message, suggested movie: ${movie.title}`,
            title: movie.title,
            title_link: `https://www.imdb.com/title/${movieDetails.imdb_id}`,
            text: '',
            image_url: `https://image.tmdb.org/t/p/w500/${movie.poster_path}`,
            thumb_url: `https://image.tmdb.org/t/p/w200/${movie.poster_path}`,
            fields: [
              {
                title: `Overview`,
                value: movie.overview,
                short: false
              },
              {
                title: `TMDB rating`,
                value: `${movie.vote_average} (votes: ${movie.vote_count})`,
                short: false
              },
              {
                title: `Genres`,
                value: genres.join(', '),
                short: false
              },
              {
                title: `Year`,
                value: moment(movie.release_date, 'YYYY-MM-DD').format('YYYY'),
                short: false
              },
            ],
            footer: 'Brought to you by MadLtd., motherfucker',
            author_name: 'MadMovie',
          }
        ]
      });
      // console.log('result', result);
    } catch (error) {
      // console.log('error', error);
      console.log('Error in using SlackService, SlackSDK postMesage()');
      throw new Error(error);
    }
    return res.status(200).end();
  }

  // ! used only for dev env
  async getGenres(req: Request, res: Response, next?: NextFunction) {
    res.status(202);
    await this.themoviedbService.getGenreNamesByIds([]);
    return res.status(200).end();
  }
}

export default CommandsController;
