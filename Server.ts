/// <reference path="typings.d.ts" />
"use strict";

// Libraries
import * as bodyParser from "body-parser";
import * as express from "express";
import * as helmet from 'helmet';
import * as path from 'path';
import * as cors from 'cors'
import * as requestLogger from 'morgan';
import * as logger from 'winston';

// Your own modules
import { DatabaseSettings } from './DatabaseSettings';
import { MongoManager } from './MongoManager';

/**
 * The server for Node
 *
 * @class Server
 */
export class Server {

  public app: express.Application;
  public port: number;

  /**
   * Constructor.
   *
   * @class Server
   * @constructor
   */
  constructor(port: number) {
    this.port = port;

    // Create the Express Application
    this.app = express();

    // Security for Express
    this.app.use(helmet());

    // Helps url encoded requests (content-type = url-encoded)
    this.app.use(bodyParser.urlencoded({ extended: false }));

    // Helps json requests (content-type = json)
    this.app.use(bodyParser.json());

    // Typescript for morgan (requestLogger) doesn't allow the string templates like 'dev' so ignore typescript this time
    // Adds logging to any request coming in, for express
    //noinspection TypeScriptValidateTypes
    this.app.use(requestLogger('dev'));

    // Enable CORS on all requests
    this.app.use(cors());
    // Creates the routes for our server
    this.initRoutes();

    // This setting allows you to have mongo initialized and connected for your Node Server
    // TODO If you aren't going to use Mongo, then remove this if statement, initAndConnectToMongo method,
    // TODO and the MongoManager import statement
    if (DatabaseSettings.useMongo) {
      let mongoManager = new MongoManager(`${__dirname}/seeds`);
      mongoManager.initAndConnectToMongo();
    }

    this.app.listen(this.port, (err) => {
      if (err) {
        logger.error(err);
        return;
      }
      logger.info(`Listening on port ${this.port}`);
    });
  }

  /**
   * Initializes all the routes for the server
   */
  public initRoutes(): void {
    this.app.use('/app', express.static(path.join(__dirname, '../dist')));

    this.app.route('/:url(node_modules|assets|server|src)/*')
    .get(Server.PageNotFound404);
  }

  public static PageNotFound404(req: express.Request, res: express.Response, next: express.NextFunction): express.Response {
    return res.send('<h1>404 Not Found</h1>');
  }
}

exports = new Server(3003).app;
