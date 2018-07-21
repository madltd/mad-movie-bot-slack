import * as express from 'express';
import * as bodyParser from 'body-parser';
import indexRouter from './routes/index.router';
import actionsRouter from './routes/actions.router';
import commandsRouter from './routes/commands.router';

class App {
  public express: express.Application;

  constructor() {
    this.express = express();
    this.express.use(bodyParser.urlencoded({ 'extended': true }));
    this.mountRoutes();
  }

  private mountRoutes(): void {
    this.express.use('/', indexRouter);
    this.express.use('/actions', actionsRouter);
    this.express.use('/commands', commandsRouter);
  }
}

export default new App().express;
