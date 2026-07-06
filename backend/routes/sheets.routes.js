const express = require('express')
const sheetsService = require('../services/sheets.service')
const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()
const isAdmin = [authenticate, requireRole('admin')]

// GET /api/sheets/status
router.get('/status', isAdmin, async (req, res) => {
  try {
    const status = await sheetsService.getSyncStatus()
    res.json(status)
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

// POST /api/sheets/connect
router.post('/connect', isAdmin, async (req, res) => {
  const { url, forceDemo } = req.body
  try {
    const result = await sheetsService.connectSheet(url, forceDemo)
    res.json(result)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// POST /api/sheets/preview
router.post('/preview', isAdmin, async (req, res) => {
  const { url, forceDemo } = req.body
  try {
    const preview = await sheetsService.previewSheet(url, forceDemo)
    res.json(preview)
  } catch (err) {
    res.status(400).json({ message: err.message })
  }
})

// POST /api/sheets/sync
router.post('/sync', isAdmin, async (req, res) => {
  const { url, students, units, forceDemo } = req.body
  if (!students || !units) {
    return res.status(400).json({ message: 'Students and Units preview data required' })
  }
  try {
    const result = await sheetsService.syncSheet(url, students, units, forceDemo)
    res.json(result)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
