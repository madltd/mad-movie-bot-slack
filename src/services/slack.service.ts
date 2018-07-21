import { WebClient, RTMClient, IncomingWebhook } from '@slack/client';

export class SlackService {

  webClient: WebClient;
  rtmClient: RTMClient;
  webhook: IncomingWebhook;

  private token: string = process.env.SLACK_TOKEN;
  private webhookUrl: string = process.env.SLACK_WEBHOOK_URL;

  constructor() {
    this.webClient = new WebClient(this.token);

    // this.rtmClient = new RTMClient(this.token);
    // this.rtmClient.start();

    // this.webhook = new IncomingWebhook(this.webhookUrl);
  }

}
