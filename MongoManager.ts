/**
 * This script inserts into mongo the contents of all the .json files in the /seeds directory.
 *
 * The name of the file is the collection that the contents of that file will be inserted into.
 *      Example: This script will insert all the records in cohort.json into the collection "cohort"
 *
 * Usage: $ node seed
 *
 * @author Tom Caflisch
 */
import * as Q from 'q';
import * as util from 'util';
import * as _ from 'lodash';
import * as errno from 'errno';
import * as path from 'path';
import {MongoClient} from 'mongodb';
import { DatabaseSettings } from "./DatabaseSettings";
import * as mongoose from 'mongoose';
import * as logger from 'winston';
const fse = require('fs-extra');

export class MongoManager {
  dir: string;

  constructor(seedsDir) {
    this.dir = seedsDir;
    if (!seedsDir)
      this.dir = `${__dirname}/seeds`;
  }

  initAndConnectToMongo() {
    // Connect to database
    mongoose.connect(DatabaseSettings.db.uri, DatabaseSettings.db.options, err => {
      if (err) {
        logger.error('MongoDB connection error: ' + err);
        logger.warn("Please make sure that mongod.exe is running.");
        process.exit(1);
      }

      logger.info("MongoDB is connected");
    });

    mongoose.connection.on('error', err => {
      if (err) {
        logger.error(err);
        process.exit(-1);
      }
    });

    if (DatabaseSettings.seedMongo) {
      // If a json file is in /seeds folder, then it will automatically create a Mongo collection with
      // the name of the collection
      this.seed();
    }
  }

  /**
   * Reads the .json files from the ./seeds folder and inserts them into mongo
   */
  seed() {
    let listOfFiles = null;

    this.load_files().then(list => {
      listOfFiles = list;
      console.log("Files in seeds folder", list);
      return this.getConnection();
    }).then(db => {
      return this.seed_db(db, listOfFiles);
    }).then(() => {
      console.log('----------------------');
      console.log('All done. Go play!');
    }).fail(err => {
      console.error(err);
    }).done();
  }

  /**
   * Loads all the json files from the ./seeds folder
   */
  load_files() {

    return Q.Promise((resolve, reject, notify) => {

      // Read all the files in the ./seeds folder
      fse.readdir(this.dir, (err, files) => {

        if(err || _.isUndefined(files)) {
          return reject('Error reading /seeds folder');
        } else {
          // Filter out everything except the .json files
          files = files.filter(file => {
            return path.extname(file) === '.json';
          });

          return resolve(files);
        }
      });
    });
  }


  /**
   * Loops through all the .json files in ./seeds and removes all the records
   *
   * @param db    - The mongo object to run queries against
   * @param list  - An array of all the .json files from the seeds folder
   */
  seed_db(db, list) {

    console.log('Seeding files from directory ' + path.resolve(this.dir));
    console.log('----------------------');

    return Q.Promise((resolve, reject) => {

      let operations = [];

      // Loop through every file in the list
      list.forEach(file => {

        // Set the filename without the extension to the variable collection_name
        let collection_name = file.split(".")[0];
        let contents = null;

        // True if the current file has contents, false if it's empty
        let hasContents = fse.statSync(path.resolve(this.dir + '/' + file)).size > 0;

        console.log('Seeding collection ' + collection_name);

        try {
          // If the file has contents, load them
          if(hasContents) {

            contents = fse.readJsonSync(this.dir + '/' + file);

            // If the seed file is NOT an array
            if (!util.isArray(contents)) {
              return reject(new Error('Seed file ' + collection_name + ' does not start with an Array'));
            }
          }

          // The chain of operations to occur for each file. Drop the existing collection if it exists, create it, insert data into it
          console.log("Attempting to drop collection");
          let chain = this.dropCollection(db, collection_name)
          .then(() => {
            console.log("Creating collection " + collection_name);
            return this.createCollection(db, collection_name);
          }).then(() => {
            console.log("Checking if there is data to insert for " + collection_name + ".");
            if(contents) {
              console.log("There is data! Inserting data into mongoDB");
              return this.insert(db, collection_name, contents)
            }
          }).fail(err => {
            return reject(this.errmsg(err));
          });

          // Push the chain for each file to an array of Promises
          operations.push(chain);

        } catch(err) {
          console.error("Failed to read: " + this.dir + '/' + file);
          console.error(err);
        }
      });

      // When all the drop/create/inserts are complete, we're finished
      Q.allSettled(operations)
      .then(() => {
        return resolve(null);
      }).fail(err => {
        return reject(err);
      }).fin(() => {
        db.close();
      });
    });
  }


  /**
   * Gets a connection to mongo
   *
   * @returns {Promise|*|Q.Promise}
   */
  getConnection() {

    return Q.Promise((resolve, reject, notify) => {

      let connectionString = null;


      // If the connection string does not start with "mongodb://", add it
      if(_.startsWith(DatabaseSettings.db.seed, "mongodb://")) {
        connectionString = DatabaseSettings.db.seed;
      } else {
        connectionString = 'mongodb://' + DatabaseSettings.db.seed;
      }

      console.log("Connecting to mongo using: " + connectionString);

      MongoClient.connect(connectionString, (err, db) => {

        if(err) {
          return reject(err);
        }

        return resolve(db);
      });
    });
  }


  /**
   * Creates a collection in mongo
   *
   * @returns {*}
   * @param db
   * @param name
   */
  createCollection(db, name) {

    return Q.Promise((resolve, reject, notify) => {

      db.createCollection(name, (err, collection) => {

        if(err) {
          console.error("An error occurred while creating " + name + " collection", err);
          return reject(err);
        }

        console.log(name + " collection created!");
        return resolve(null);
      });
    });
  }


  /**
   * Drops a collection from mongo if it exists
   *
   * @param collection  - The collection to drop
   * @returns {*}
   */
  dropCollection(db, name) {
    return Q.Promise((resolve, reject, notify) => {

      // Check if the collection exists, else don't do anything
      this.collectionExist(db, name)
      .then((exists) => {
        // If the collection exists, drop it
        if(exists) {
          console.log("Dropping collection...");
          db.dropCollection(name, (err, reply) => {

            if(err) {
              console.log("An error occurred while trying to drop collection...");
              console.error(err);
              return resolve(null);
            }

            console.log(name + " collection dropped.");
            return resolve(null);
          });
        } else {
          console.log("Collection does not exist, no need to drop.");
          return resolve(null);
        }
      })
      .catch(err => {
        console.error(err);
        console.log("An error occurred while dropping collection...");
        return reject(err);
      });
    });
  }


  /**
   * Checks if a collection exists
   *
   * @param db    - The db to check if a collection exists in
   * @param name  - The name of the collection we want to see if exists
   * @returns {Promise|*|Q.Promise}
   */
  collectionExist(db, name) {

    return Q.Promise((resolve, reject, notify) => {
      console.log("Checking if " + name + " collection exists.");
      db.collection(name, (err, collection) => {
        if(err) {
          console.error("An error occurred while checking if the (" + name + ") collection exists...");
          return resolve(false);
        }

        // If the collection exists in the mongo db
        if(collection) {
          console.log(name + " collection exists...");
          console.log(collection);
          return resolve(true);
        } else {
          console.log(name + " collection does not exist...");
          return resolve(false);
        }
      });
    });
  }

  /**
   * Inserts an array of objects into mongo
   *
   * @param db              - The db to insert into
   * @param collection_name - The collection to insert into
   * @param contents        - The contents to be inserted
   * @returns {*}
   */
  insert(db, collection_name, contents) {

    return Q.Promise((resolve, reject, notify) => {

      // If it's an empty array, there's nothing to insert
      if(contents.length !== 0) {

        return db.collection(collection_name)
        .insert(contents, (err, result) => {

          if(err) {
            console.error("An error occurred while inserting contents");
            console.error(err);
            return reject(err);
          }

          console.log("Inserted " + contents.length + " items for " + collection_name);
          return resolve(result);
        });
      }
      else {
        console.log("There is no data to insert.");
        return resolve(null);
      }
    });
  }


  /**
   * Formats error messages to display the actual error message instead of all the errno codes and what not.
   *
   * @param err         - The error object that may or may not contain an errno code
   * @returns {string}  - A simple message
   */
  errmsg(err) {

    let str = 'Error: ';
    // if it's a libuv error then get the description from errno
    if (errno.errno[err.errno]) {
      str += errno.errno[err.errno].description
    } else {
      str += err.message
    }

    // if it's a `fs` error then it'll have a 'path' property
    if (err.path) {
      str += ' [' + err.path + ']'
    }
    return str
  }

}
