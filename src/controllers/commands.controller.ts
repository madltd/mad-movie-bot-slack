import { Request, Response, NextFunction } from 'express';
import { SlackService } from './../services/slack.service';
import { TheMovieDBService } from './../services/themoviedb.service';
import { FirestoreService } from '../services/firestore.service';
import { DiscoverMovieResponseItem, MovieDetailResponse, TeamIdTokenMap } from '../models';
import * as moment from 'moment';
import { CheerioService } from './../services/cheerio.service';

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

// interface PreferensesResponse {
//   //
// }

class CommandsController {

  private slackService: SlackService;
  private themoviedbService: TheMovieDBService;
  private firestoreService: FirestoreService;
  private cheerioService: CheerioService;

  constructor() {
    this.slackService = new SlackService();
    this.themoviedbService = new TheMovieDBService();
    this.firestoreService = new FirestoreService();
    this.cheerioService = new CheerioService();
  }

  async handleIndex(req: Request, res: Response, next?: NextFunction) {
    res.status(202).writeContinue();
    const slackResponse: SlashCommandResponse = req.body;

    let movie: DiscoverMovieResponseItem;
    let movieDetails: MovieDetailResponse;
    const imdbRating: { rating: number | string; count: number | string; } = {
      rating: 'unknown',
      count: 'unknown'
    };

    let token = process.env.SLACK_TOKEN;

    try {
      // console.log('team_id', slackResponse.team_id);
      const response = await this.firestoreService.getDocumentFromCollection<TeamIdTokenMap>('teams', 'team_id', '==', slackResponse.team_id);

      if (response.success) {
        if (response.data.access_token) {
          token = response.data.access_token;
        } else {
          console.log('Response from firestoreService.getDocumentFromCollection() was successful, but unable to get token', response);
        }
      } else {
        console.log('Error in response from firestoreService.getDocumentFromCollection()', response.message);
        console.log(response.error);
      }
    } catch (error) {
      console.log('Error in calling firestoreService.getDocumentFromCollection()');
      throw new Error(error);
    }

    this.parsePreferences(slackResponse.text, token, slackResponse.channel_id, slackResponse.user_id);

    const tempMess = await this.slackService.webClient.chat.postMessage({
      token,
      channel: slackResponse.channel_id,
      text: 'Fetching a mad movie for you...',
      as_user: false
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
        const movieDetailsRaw = await this.themoviedbService.getMovieDetails(movie.id, true);

        if (movieDetailsRaw.success) {
          movieDetails = movieDetailsRaw.data;
          // console.log('movieDetails.videos.results', movieDetails.videos.results);
        }
      } catch (error) {
        console.log(`Error calling getMovieDetails(${movie.id}) in CommandsController`);
        throw new Error(error);
      }
    }

    try {
      const unparsedImdbRating = await this.cheerioService.getValueBySelector(
        ['.imdbRating span[itemprop=ratingValue]', '.imdbRating span[itemprop=ratingCount]'],
        `https://www.imdb.com/title/${movieDetails.imdb_id}`
      );
      // console.log('unparsedImdbRating', unparsedImdbRating);
      const parsedImdbRating = {
        rating: parseFloat(unparsedImdbRating[0]),
        count: parseInt(unparsedImdbRating[1].replace(/,/g, ''), 10)
      };
      // console.log('parsedImdbRating', parsedImdbRating);
      if (!Number.isNaN(parsedImdbRating.rating)) {
        imdbRating['rating'] = parsedImdbRating.rating;
      }
      if (!Number.isNaN(parsedImdbRating.count)) {
        imdbRating['count'] = parsedImdbRating.count.toLocaleString('en-AU');
      }
    } catch (error) {
      console.log('error in parsing ratings', error);
    }

    try {
      const result = await this.slackService.webClient.chat.postMessage({
        token,
        channel: slackResponse.channel_id,
        text: `*IMDB*: https://www.imdb.com/title/${movieDetails.imdb_id}\n${movieDetails.videos && movieDetails.videos.results && movieDetails.videos.results.length > 0 ? `*Trailer:* https://youtube.com/watch?v=${movieDetails.videos.results[0].key}` : `_No trailers found :(_`}`,
        parse: 'full',
        unfurl_links: false,
        unfurl_media: true,
        // text: `*${slackResponse.command}* ${slackResponse.text}`,
        mrkdwn: true,
        as_user: false,
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
                title: `IMDB rating`,
                value: `${imdbRating.rating} (votes: ${imdbRating.count})`,
                short: false
              },
              {
                title: `Genres`,
                value: movieDetails.genres.map(g => g.name).join(', '),
                short: false
              },
              {
                title: `Year`,
                value: moment(movie.release_date, 'YYYY-MM-DD').format('YYYY'),
                short: false
              }
            ],
            footer: 'Brought to you by MadLtd.',
            author_name: 'MadMovie',
          }
        ]
      })
        .then(r => {
          // console.log(tempMess);
          this.slackService.webClient.chat.delete({
            channel: slackResponse.channel_id,
            // @ts-ignore
            ts: tempMess.ts,
            token
          }).catch(deleteError => console.log('Unable to delete temporary message', deleteError));
        });
    } catch (error) {
      const slackErrorMess = await this.slackService.webClient.chat.postEphemeral({
        token,
        channel: slackResponse.channel_id,
        text: 'Something went wrong... MadMovieBot is broken...',
        as_user: false,
        user: slackResponse.user_id
      });
      // console.log('error', error);
      console.log('Error in using SlackService, SlackSDK postMesage()');
      throw new Error(error);
    }
    return res.status(200).end();
  }

  private parsePreferences(text: string, token: string, channel: string, user: string) {
    if (['help', 'h', '--help', '-h', '-help'].includes(text)) {
      this.slackService.webClient.chat.postEphemeral({
        token,
        channel,
        user,
        as_user: false,
        text: `*MadMovieBot* can suggests you random movies based on your preferences\nEmpty input will show a random suggestion\nYou may also enter preferences in the following format: *\`/madmovie {filterBy}[:{matchType}]={preference1}[|preference2|preference3(...)]\`*\n\n*Available filters:*\n - genre\n - release_date\n - tmdb_rating - _(rating on The Movie Database)_\n\n*Available match types:*\n - genre:all - _must match all specified genres_\n - genre:any - _must match at least one of the specified_ _*(default)*_\n\n*Examples:*\n - *\`/madmovie genre:any=thriller|crime\`* - _This will show a random movie which genre matches at least one of the specified (thriller or crime)_`
      });
    }
    // const spaceSeparated =
  }

  // ! used only for dev env
  async getGenres(req: Request, res: Response, next?: NextFunction) {
    res.status(202);
    await this.themoviedbService.getGenreNamesByIds([]);
    return res.status(200).end();
  }
}

export default CommandsController;
