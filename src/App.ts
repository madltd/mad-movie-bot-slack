'use strict';
import * as express from 'express';
import { join } from 'path';
import * as bodyParser from 'body-parser';
import indexRouter from './routes/index.router';
import actionsRouter from './routes/actions.router';
import commandsRouter from './routes/commands.router';
import oauthRouter from './routes/oauth.router';

class App {
  public express: express.Application;

  constructor() {
    this.express = express();
    this.express.set('views', join(__dirname, '../views'));
    this.express.set('view engine', 'pug');
    this.express.use(bodyParser.urlencoded({ 'extended': true }));
    this.mountRoutes();
  }

  private mountRoutes(): void {
    this.express.use('/', indexRouter);
    this.express.use('/api/actions', actionsRouter);
    this.express.use('/api/commands', commandsRouter);
    this.express.use('/api/oauth', oauthRouter);
  }
}

export default new App().express;
