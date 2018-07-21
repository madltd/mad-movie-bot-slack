import * as express from 'express';
const router = express.Router();

import IndexController from './../controllers/index.controller';

router.get('/', new IndexController().handleIndex);

export default router;
