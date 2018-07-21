import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
const router = express.Router();

import CommandsController from '../controllers/commands.controller';

router.post('/', (req: Request, res: Response, next: NextFunction) => new CommandsController().handleIndex(req, res, next));

// * For debugging purposes only
if (process.env.NODE_ENV === 'dev') {
  router.get('/genres', (req: Request, res: Response, next: NextFunction) => new CommandsController().getGenres(req, res, next));
}

export default router;
