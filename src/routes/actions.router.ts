import * as express from 'express';
const router = express.Router();

import ActionsController from '../controllers/actions.controller';

router.get('/', new ActionsController().handleIndex);

export default router;
