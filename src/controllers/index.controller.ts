import { Request, Response, NextFunction } from 'express';

class IndexController {

  constructor() { }

  handleIndex(req: Request, res: Response, next?: NextFunction) {
    // res.json({
    //   message: 'Hello World!'
    // });
    res.render('index');
  }
}

export default IndexController;
