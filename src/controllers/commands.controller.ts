import { Request, Response, NextFunction } from 'express';
import { SlackService } from './../services/slack.service';
import { TheMovieDBService } from './../services/themoviedb.service';
import { FirestoreService } from '../services/firestore.service';
import { DiscoverMovieResponseItem, MovieDetailResponse, TeamIdTokenMap, Preference } from '../models';
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

interface PreferensesResponse {
  contunue: boolean;
  preferences?: Preference[];
}

interface ImdbMovieRating {
  rating: number | string;
  count: number | string;
}

class CommandsController {

  private slackService: SlackService;
  private themoviedbService: TheMovieDBService;
  private firestoreService: FirestoreService;
  private cheerioService: CheerioService;

  private slashCommandResponse: SlashCommandResponse;
  private token: string;

  constructor() {
    this.slackService = new SlackService();
    this.themoviedbService = new TheMovieDBService();
    this.firestoreService = new FirestoreService();
    this.cheerioService = new CheerioService();

    this.token = process.env.SLACK_TOKEN;
  }

  async getSlackData(): Promise<void> {
    try {
      // console.log('team_id', this.slashCommandResponse.team_id);
      const response = await this.firestoreService.getDocumentFromCollection<TeamIdTokenMap>('teams', 'team_id', '==', this.slashCommandResponse.team_id);

      if (response.success) {
        if (response.data.access_token) {
          this.token = response.data.access_token;
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
  }

  async handleIndex(req: Request, res: Response, next?: NextFunction) {
    res.status(202).writeContinue();
    this.slashCommandResponse = req.body;

    this.getSlackData();

    const preferencesResponse = this.parsePreferences();

    for (const preference of preferencesResponse.preferences) {
      console.log('preference', preference);
    }

    if (!preferencesResponse.contunue) {
      return;
    }

    let tempMess;
    try {
      tempMess = await this.slackService.webClient.chat.postMessage({
        token: this.token,
        channel: this.slashCommandResponse.channel_id,
        text: 'Fetching a mad movie for you. Please hold...',
        as_user: false
      });
    } catch (error) {
      console.log('Error posing temporary message');
      throw new Error(error);
    }

    let movie: DiscoverMovieResponseItem;
    let movieDetails: MovieDetailResponse;
    const imdbRating: ImdbMovieRating = {
      rating: 'unknown',
      count: 'unknown'
    };

    try {
      const movieRaw = await this.themoviedbService.getRandomMovie(preferencesResponse.preferences);

      if (movieRaw.success) {
        movie = movieRaw.data;
      } else {
        console.log('Error in getting a movie from the api.');
        console.log(movieRaw.error);
        // TODO: retries?
      }
    } catch (error) {
      console.log('Error calling themoviedbService.getRandomMovie() in CommandsController');
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
        console.log(`Error calling themoviedbService.getMovieDetails(${movie.id}) in CommandsController`);
        throw new Error(error);
      }
    } else {
      this.sendBrokenBotMessage();
      return;
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


    this.slackService.webClient.chat.postMessage({
      token: this.token,
      channel: this.slashCommandResponse.channel_id,
      text: `*IMDB*: https://www.imdb.com/title/${movieDetails.imdb_id}\n${movieDetails.videos && movieDetails.videos.results && movieDetails.videos.results.length > 0 ? `*Trailer:* https://youtube.com/watch?v=${movieDetails.videos.results[0].key}` : `_No trailers found :(_`}`,
      parse: 'full',
      unfurl_links: false,
      unfurl_media: true,
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
        this.slackService.webClient.chat.delete({
          channel: this.slashCommandResponse.channel_id,
          ts: tempMess.ts,
          token: this.token
        }).catch(error => {
          console.log('Unable to delete temporary message');
          throw new Error(error);
        });
      })
      .catch(error => {
        this.sendBrokenBotMessage();
        console.log('Error in using SlackService, SlackSDK postMesage()');
        throw new Error(error);
      });

    return res.status(200).end();
  }

  private parsePreferences(): PreferensesResponse {
    let result: PreferensesResponse = {
      contunue: true
    };

    const wordsArr = this.slashCommandResponse.text.split(' ');

    if (wordsArr.length > 0 && wordsArr[0] !== '') {
      // if the first word ~help then show heklp message and discontinue
      if (['help', 'hepl', 'h', '--help', '-h', '-help'].includes(wordsArr[0])) {
        this.slackService.webClient.chat.postEphemeral({
          token: this.token,
          channel: this.slashCommandResponse.channel_id,
          user: this.slashCommandResponse.user_id,
          as_user: false,
          text: `*MadMovieBot* can suggests you random movies based on your preferences\nEmpty input will show a random suggestion\nYou may also enter preferences in the following format: *\`/madmovie {filterBy}[:{matchType}]={preference1}[|preference2|preference3(...)]\`*\n\n*Available filters:*\n - genre\n - release_date\n - tmdb_rating - _(rating on The Movie Database)_\n\n*Available match types:*\n - genre:all - _must match all specified genres_\n - genre:any - _must match at least one of the specified_ _*(default)*_\n\n*Examples:*\n - *\`/madmovie genre:any=thriller|crime\`* - _This will show a random movie which genre matches at least one of the specified (thriller or crime)_`
        }).catch(error => {
          console.log('Error in posting help message');
          throw new Error(error);
        });

        result = {
          contunue: false
        };
      } else if (['list', 'lits', 'l', '--list', '-l', '-list'].includes(wordsArr[0])) {
        switch (wordsArr[1]) {
          case 'genre': case 'genres':
            this.slackService.webClient.chat.postEphemeral({
              token: this.token,
              channel: this.slashCommandResponse.channel_id,
              user: this.slashCommandResponse.user_id,
              as_user: false,
              text: `*Available genres:*\n - genre1`
            }).catch(error => {
              console.log('Error in posting help message');
              throw new Error(error);
            });
            break;
          case 'list': case 'lists':
            this.slackService.webClient.chat.postEphemeral({
              token: this.token,
              channel: this.slashCommandResponse.channel_id,
              user: this.slashCommandResponse.user_id,
              as_user: false,
              text: `*Available options to list:*\n - option1`
            }).catch(error => {
              console.log('Error in posting help message');
              throw new Error(error);
            });
            break;
          case 'filter': case 'filters':
            this.slackService.webClient.chat.postEphemeral({
              token: this.token,
              channel: this.slashCommandResponse.channel_id,
              user: this.slashCommandResponse.user_id,
              as_user: false,
              text: `*Available filters:*\n - filter1`
            }).catch(error => {
              console.log('Error in posting help message');
              throw new Error(error);
            });
            break;
          case 'matchType': case 'matchType': case 'match-type': case 'match-types':
            this.slackService.webClient.chat.postEphemeral({
              token: this.token,
              channel: this.slashCommandResponse.channel_id,
              user: this.slashCommandResponse.user_id,
              as_user: false,
              text: `*Available match types:*\n - matchtype1`
            }).catch(error => {
              console.log('Error in posting help message');
              throw new Error(error);
            });
            break;
          case 'command': case 'commands': case 'comand': case 'comands':
            this.slackService.webClient.chat.postEphemeral({
              token: this.token,
              channel: this.slashCommandResponse.channel_id,
              user: this.slashCommandResponse.user_id,
              as_user: false,
              text: `*Available commands:*\n - \`list [option]\``
            }).catch(error => {
              console.log('Error in posting help message');
              throw new Error(error);
            });
            break;
          default:
            this.slackService.webClient.chat.postEphemeral({
              token: this.token,
              channel: this.slashCommandResponse.channel_id,
              user: this.slashCommandResponse.user_id,
              as_user: false,
              text: `*Unknown \`list\` option!*\n\n*Available options to list:*\n - option1`
            }).catch(error => {
              console.log('Error in posting help message');
              throw new Error(error);
            });
        }

        result = {
          contunue: false
        };
      } else {
        const preferencesArr: Preference[] = [];

        for (const preferenceRaw of wordsArr) {

          const equalsSeparated = preferenceRaw.split('=');
          let preference: Preference;

          if (equalsSeparated.length === 1) {
            preference = {
              filter: 'genre',
              matchType: 'any',
              values: [equalsSeparated[0]]
            };
          }
          if (equalsSeparated.length > 1) {

            let matchType: string;
            const colonSeparated = equalsSeparated[0].split(':');
            if (colonSeparated.length === 1) {
              matchType = 'any'; // TODO: default to a valid matchType for a given filter
            } else {
              matchType = colonSeparated[1]; // TODO: check if valid matchType for a given filter
            }

            preference = {
              // TODO: check if valid filter, etc...
              filter: colonSeparated[0],
              matchType,
              values: equalsSeparated[1].split('|')
            };
          }

          preferencesArr.push(preference);
        }

        result = {
          contunue: true,
          preferences: preferencesArr
        };
      }
    }

    return result;
  }

  private sendBrokenBotMessage(): void {
    this.slackService.webClient.chat.postEphemeral({
      token: this.token,
      channel: this.slashCommandResponse.channel_id,
      text: 'Something went wrong... MadMovieBot is broken...',
      as_user: false,
      user: this.slashCommandResponse.user_id
    })
      .catch(error => {
        console.log('Error in sending bot broken message');
        throw new Error(error);
      });
  }

  // ! used only for dev env
  async getGenres(req: Request, res: Response, next?: NextFunction) {
    res.status(202);
    await this.themoviedbService.getGenreNamesByIds([]);
    return res.status(200).end();
  }
}

export default CommandsController;
