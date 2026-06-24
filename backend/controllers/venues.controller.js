const db = require('../config/db')

// Simple in-memory mock venues list
let mockVenues = [
  { id: 1, name: 'LH 101', building: 'Main Block', floor: 'Ground', venue_type: 'lecture_hall', latitude: -1.04567, longitude: 37.07345, radius_meters: 100, capacity: 200, is_active: true },
  { id: 2, name: 'LH 102', building: 'Main Block', floor: 'Ground', venue_type: 'lecture_hall', latitude: -1.04570, longitude: 37.07350, radius_meters: 100, capacity: 150, is_active: true },
  { id: 3, name: 'ICT Lab 1', building: 'Science Block', floor: '1st', venue_type: 'lab', latitude: -1.04600, longitude: 37.07400, radius_meters: 80, capacity: 60, is_active: true },
  { id: 4, name: 'Sports Ground', building: 'Outdoors', floor: 'Ground', venue_type: 'outdoor', latitude: -1.04700, longitude: 37.07500, radius_meters: 300, capacity: 500, is_active: true }
]

const getVenues = async (req, res) => {
  try {
    if (!db.isAvailable()) {
      return res.json(mockVenues.filter(v => v.is_active))
    }
    const [rows] = await db.pool().query('SELECT * FROM venues WHERE is_active = true')
    res.json(rows)
  } catch (error) {
    console.error('Error fetching venues:', error)
    res.status(500).json({ message: 'Server error fetching venues' })
  }
}

const getVenueById = async (req, res) => {
  const { id } = req.params
  try {
    if (!db.isAvailable()) {
      const v = mockVenues.find(v => v.id === parseInt(id) && v.is_active)
      if (!v) return res.status(404).json({ message: 'Venue not found' })
      return res.json(v)
    }
    const [rows] = await db.pool().query('SELECT * FROM venues WHERE id = ? AND is_active = true', [id])
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Venue not found' })
    }
    res.json(rows[0])
  } catch (error) {
    console.error('Error fetching venue:', error)
    res.status(500).json({ message: 'Server error fetching venue' })
  }
}

const getVenuesByBuilding = async (req, res) => {
  const { building } = req.params
  try {
    if (!db.isAvailable()) {
      return res.json(mockVenues.filter(v => v.building === building && v.is_active))
    }
    const [rows] = await db.pool().query('SELECT * FROM venues WHERE building = ? AND is_active = true', [building])
    res.json(rows)
  } catch (error) {
    console.error('Error fetching venues by building:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

const createVenue = async (req, res) => {
  const { name, building, floor, venue_type, latitude, longitude, wifi_bssid, capacity } = req.body
  
  let radius_meters = 100
  switch (venue_type) {
    case 'lecture_hall': radius_meters = 100; break;
    case 'lab': radius_meters = 80; break;
    case 'seminar_room': radius_meters = 60; break;
    case 'outdoor': radius_meters = 200; break;
    case 'field': radius_meters = 500; break;
    case 'auditorium': radius_meters = 120; break;
    default: radius_meters = 100;
  }

  try {
    if (!db.isAvailable()) {
      const newId = mockVenues.length + 1
      const newVenue = { id: newId, name, building, floor, venue_type, latitude, longitude, radius_meters, wifi_bssid, capacity, is_active: true }
      mockVenues.push(newVenue)
      return res.status(201).json({ id: newId, message: 'Venue created successfully (Mock)', radius_meters })
    }
    const [result] = await db.pool().query(
      `INSERT INTO venues (name, building, floor, venue_type, latitude, longitude, radius_meters, wifi_bssid, capacity, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, building, floor, venue_type, latitude, longitude, radius_meters, wifi_bssid || null, capacity || null, req.user ? req.user.id : null]
    )
    res.status(201).json({ id: result.insertId, message: 'Venue created successfully', radius_meters })
  } catch (error) {
    console.error('Error creating venue:', error)
    res.status(500).json({ message: 'Server error creating venue' })
  }
}

const updateVenue = async (req, res) => {
  const { id } = req.params
  const { name, building, floor, venue_type, latitude, longitude, wifi_bssid, capacity } = req.body
  
  let radius_meters = null
  if (venue_type) {
    switch (venue_type) {
      case 'lecture_hall': radius_meters = 100; break;
      case 'lab': radius_meters = 80; break;
      case 'seminar_room': radius_meters = 60; break;
      case 'outdoor': radius_meters = 200; break;
      case 'field': radius_meters = 500; break;
      case 'auditorium': radius_meters = 120; break;
      default: radius_meters = 100;
    }
  }

  try {
    if (!db.isAvailable()) {
      const v = mockVenues.find(v => v.id === parseInt(id))
      if (!v) return res.status(404).json({ message: 'Venue not found' })
      if (name) v.name = name
      if (building) v.building = building
      if (floor) v.floor = floor
      if (venue_type) { v.venue_type = venue_type; v.radius_meters = radius_meters }
      if (latitude) v.latitude = latitude
      if (longitude) v.longitude = longitude
      if (wifi_bssid !== undefined) v.wifi_bssid = wifi_bssid
      if (capacity !== undefined) v.capacity = capacity
      return res.json({ message: 'Venue updated successfully (Mock)' })
    }

    const fields = []
    const values = []
    if (name) { fields.push('name = ?'); values.push(name) }
    if (building) { fields.push('building = ?'); values.push(building) }
    if (floor) { fields.push('floor = ?'); values.push(floor) }
    if (venue_type) { fields.push('venue_type = ?'); values.push(venue_type); fields.push('radius_meters = ?'); values.push(radius_meters) }
    if (latitude) { fields.push('latitude = ?'); values.push(latitude) }
    if (longitude) { fields.push('longitude = ?'); values.push(longitude) }
    if (wifi_bssid !== undefined) { fields.push('wifi_bssid = ?'); values.push(wifi_bssid) }
    if (capacity !== undefined) { fields.push('capacity = ?'); values.push(capacity) }

    if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' })

    values.push(id)
    await db.pool().query(`UPDATE venues SET ${fields.join(', ')} WHERE id = ?`, values)
    res.json({ message: 'Venue updated successfully' })
  } catch (error) {
    console.error('Error updating venue:', error)
    res.status(500).json({ message: 'Server error updating venue' })
  }
}

const deleteVenue = async (req, res) => {
  const { id } = req.params
  try {
    if (!db.isAvailable()) {
      const v = mockVenues.find(v => v.id === parseInt(id))
      if (!v) return res.status(404).json({ message: 'Venue not found' })
      v.is_active = false
      return res.json({ message: 'Venue deleted successfully (Mock)' })
    }
    await db.pool().query('UPDATE venues SET is_active = false WHERE id = ?', [id])
    res.json({ message: 'Venue deleted successfully' })
  } catch (error) {
    console.error('Error deleting venue:', error)
    res.status(500).json({ message: 'Server error deleting venue' })
  }
}

module.exports = {
  getVenues,
  getVenueById,
  getVenuesByBuilding,
  createVenue,
  updateVenue,
  deleteVenue
}
