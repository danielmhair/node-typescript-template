import * as _ from 'lodash';
import { Collection } from './collection.model';

export class CollectionCtrl {
  // Get list of clients
  public index(req, res) {
    Collection.find({}, function(err, documents) {
      if(err) { return CollectionCtrl.handleError(res, err); }
      return res.status(200).json(documents);
    });
  }

  // Creates a new state in the DB.
  public create(req, res) {
    if (req.body._id == null) delete req.body._id;
    Collection.create(req.body, function(err, collection) {
      if(err) { return CollectionCtrl.handleError(res, err); }
      return res.status(201).json(collection);
    });
  }

  // Updates an existing state in the DB.
  public update(req, res) {
    if(req.body._id) { delete req.body._id; }
    Collection.findById(req.params.id, function (err, document) {
      if (err) { return CollectionCtrl.handleError(res, err); }
      if(!document) { return res.status(404).send('Not Found'); }
      var updated = _.merge(document, req.body);
      updated.save(function (err) {
        if (err) { return CollectionCtrl.handleError(res, err); }
        return res.status(200).json(document);
      });
    });
  }

  // Deletes a state from the DB.
  public destroy(req, res) {
    Collection.find({ _id: req.params.id }).remove(function(err) {
      if(err) { return CollectionCtrl.handleError(res, err); }
      return res.status(204).send('No Content');
    });
  }

  public static handleError(res, err) {
    console.error(err);
    return res.status(500).send({ error: err });
  }
}