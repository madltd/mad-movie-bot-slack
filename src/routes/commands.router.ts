import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
const router = express.Router();

import CommandsController from '../controllers/commands.controller';

// const commandsController = new CommandsController();

router.post('/', (req: Request, res: Response, next: NextFunction) => new CommandsController().handleIndex(req, res, next));
router.get('/genres', (req: Request, res: Response, next: NextFunction) => new CommandsController().getGenres(req, res, next)); // ! DEV

export default router;
