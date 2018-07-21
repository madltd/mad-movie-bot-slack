'use strict';
import app from './src/App';
import * as errorHandler from 'errorhandler';

const port = process.env.PORT || 3000;

if (process.env.NODE_ENV === 'dev') {
  app.use(errorHandler());
}

app.listen(port, (err) => {
  if (err) {
    return console.log(err);
  }

  return console.log(`Server is listening on localhost:${port}`);
});
