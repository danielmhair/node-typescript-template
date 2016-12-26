'use strict';
import { Router } from 'express';
import { CollectionCtrl } from './collection.controller';
import * as jwtCheck from '../jwtCheck';

const router = Router();
const controller = new CollectionCtrl();

router.get('/', jwtCheck, controller.index);
router.post('/', jwtCheck, controller.create);
router.put('/:id', jwtCheck, controller.update);
router.patch('/:id', jwtCheck, controller.update);
router.delete('/:id', jwtCheck, controller.destroy);

exports = router;