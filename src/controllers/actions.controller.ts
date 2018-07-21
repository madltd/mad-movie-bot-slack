import { Request, Response } from 'express';

class ActionsController {

  constructor() { }

  handleIndex(req: Request, res: Response) {
    res.json({
      message: 'Actions'
    });
  }
}

export default ActionsController;
