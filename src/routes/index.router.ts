import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
const router = express.Router();

import IndexController from './../controllers/index.controller';

router.get('/', (req: Request, res: Response, next: NextFunction) => new IndexController().handleIndex(req, res, next));

export default router;
