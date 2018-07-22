import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
const router = express.Router();

import OauthController from './../controllers/oauth.controller';

router.get('/', (req: Request, res: Response, next: NextFunction) => new OauthController().handleIndex(req, res, next));

export default router;
