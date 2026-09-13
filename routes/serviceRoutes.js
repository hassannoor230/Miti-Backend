const express = require('express');
const { list, getOne, create, update, remove } = require('../controllers/servicesController');
const { requireAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.get('/', list);
router.get('/:id', getOne);
router.post('/', requireAdmin, upload.single('image'), create);
router.put('/:id', requireAdmin, upload.single('image'), update);
router.delete('/:id', requireAdmin, remove);

module.exports = router;
