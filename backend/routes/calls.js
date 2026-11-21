const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();
const DAILY_BASE_URL = 'https://api.daily.co/v1';

async function dailyRequest(path, body) {
  // Read at request time so dotenv values are always available
  const DAILY_API_KEY = process.env.DAILY_API_KEY || process.env.Daily_Co_Secret_Key;
  if (!DAILY_API_KEY) {
    throw new Error('DAILY_API_KEY is not configured');
  }

  const response = await fetch(`${DAILY_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DAILY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.msg || 'Daily.co request failed');
  }

  return data;
}

router.post('/create-room', auth, async (req, res) => {
  try {
    const room = await dailyRequest('/rooms', {
      properties: {
        exp: Math.floor(Date.now() / 1000) + 3600,
        enable_chat: true,
        enable_screenshare: true,
      },
    });

    res.json({
      roomName: room.name,
      roomUrl: room.url,
    });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to create Daily room' });
  }
});

router.post('/create-token', auth, async (req, res) => {
  const { roomName } = req.body;

  if (!roomName) {
    return res.status(400).json({ msg: 'roomName is required' });
  }

  try {
    const tokenData = await dailyRequest('/meeting-tokens', {
      properties: {
        room_name: roomName,
        is_owner: req.user?.role === 'doctor',
        exp: Math.floor(Date.now() / 1000) + 3600,
        user_name: req.user?.name || 'User',
      },
    });

    res.json({ token: tokenData.token });
  } catch (err) {
    res.status(500).json({ msg: err.message || 'Failed to create Daily token' });
  }
});

module.exports = router;
