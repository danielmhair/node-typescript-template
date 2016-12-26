import { Schema, model } from 'mongoose';

let CollectionSchema = new Schema({
  // _id is already included
  property: String,
}, { collection: 'Collection' });

export const Collection = model('Collection', CollectionSchema);
