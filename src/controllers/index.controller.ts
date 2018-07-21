import { Request, Response } from 'express';

class IndexController {

  constructor() { }

  handleIndex(req: Request, res: Response) {
    res.json({
      message: 'Hello World!'
    });
  }
}

export default IndexController;
