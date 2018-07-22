import { Request, Response, NextFunction } from 'express';
import { post } from 'request';
import { SlackService } from './../services/slack.service';

export interface OAuthSlackResponse {
  ok: boolean;
  access_token: string;
  scope: string;
  user_id: string;
  team_name: string;
  team_id: string;
  incoming_webhook: IncomingWebhook;
  scopes: string[];
}

export interface IncomingWebhook {
  channel: string;
  channel_id: string;
  configuration_url: string;
  url: string;
}

export interface SlackTeamSuccessfulResponse {
  ok: boolean;
  team: SlackTeam;
  scopes: string[];
  acceptedScopes: string[];
}

export interface SlackTeam {
  id: string;
  name: string;
  domain: string;
  email_domain: string;
  icon: {
    image_34: string;
    image_44: string;
    image_68: string;
    image_88: string;
    image_102: string;
    image_132: string;
    image_230: string;
    image_original: string;
  };
}

class IndexController {

  private slackService: SlackService;

  constructor() {
    this.slackService = new SlackService();
  }

  async handleIndex(req: Request, res: Response, next?: NextFunction): Promise<void> {
    // const authData = {
    //   form: {
    //     client_id: process.env.SLACK_CLIENT_ID,
    //     client_secret: process.env.SLACK_CLIENT_SECRET,
    //     code: req.query.code
    //   }
    // };

    // post('https://slack.com/api/oauth.access', authData, (error, response, body) => {
    //   if (!error && response.statusCode === 200) {
    //     console.log('Request was successfull', body);
    //     if (body.ok) {
    //       console.log('Authentication was successful', body);
    //     } else {
    //       console.log('Authentication failed', body.error);
    //     }
    //   } else {
    //     console.log('Error in calling request in OAuth controller');
    //     throw new Error(error);
    //   }
    // });


    try {
      const slackOauthResponse = await this.slackService.webClient.oauth.access({
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code: req.query.code
      });

      if (slackOauthResponse.ok) {
        const successfulResponse: OAuthSlackResponse = slackOauthResponse as OAuthSlackResponse;
        // console.log('Authentication was successful', slackOauthResponse);
        // TODO: implement try-catch
        const teamInfo = await this.slackService.webClient.team.info({ token: successfulResponse.access_token });
        // console.log('teamInfo', teamInfo);
        if (teamInfo.ok) {
          const successfulTeamInfo: SlackTeamSuccessfulResponse = teamInfo as SlackTeamSuccessfulResponse;

          this.slackService.webClient.chat.postMessage({
            channel: successfulResponse.incoming_webhook.channel_id,
            text: `Now your Slack Space may enjoy *Mad Movie Bot*\nJust type *\`/madmovie\`* and recieve a random movie suggestion`,
            mrkdwn: true
          });

          res.redirect(`https://${successfulTeamInfo.team.domain}.slack.com/messages/${successfulResponse.incoming_webhook.channel_id}`);
        }
      } else {
        console.log('Authentication failed', slackOauthResponse);
      }
    } catch (error) {
      console.log('Error in calling slackService.webClient.oauth.access() in OAuth controller');
      throw new Error(error);
    }

  }
}

export default IndexController;
