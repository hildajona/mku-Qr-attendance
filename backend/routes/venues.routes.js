const express = require('express')
const router = express.Router()
const { getVenues, getVenueById, getVenuesByBuilding, createVenue, updateVenue, deleteVenue } = require('../controllers/venues.controller')
const { authenticate, requireRole } = require('../middleware/auth')

// Lecturer and admin can view venues
router.get('/', authenticate, getVenues)
router.get('/:id', authenticate, getVenueById)
router.get('/building/:building', authenticate, getVenuesByBuilding)

// Only admin can modify venues
router.post('/', authenticate, requireRole('admin'), createVenue)
router.put('/:id', authenticate, requireRole('admin'), updateVenue)
router.delete('/:id', authenticate, requireRole('admin'), deleteVenue)

module.exports = router
