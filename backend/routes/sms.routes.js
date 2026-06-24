const express = require('express')
const router = express.Router()
const ussdRoutes = require('./ussd.routes')

// Webhook endpoint: POST /api/sms/incoming
// Forwards to the shared SMS incoming handler in ussd.routes.js
router.post('/incoming', (req, res, next) => {
  req.url = '/sms-incoming'
  ussdRoutes(req, res, next)
})

module.exports = router
