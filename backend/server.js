const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const auth = require('./middleware/auth');
const Patient = require('./models/Patient');
const Appointment = require('./models/Appointment');
const { startAppointmentReminders } = require('./utils/appointmentReminders');

dotenv.config();

const app = express();

// ─── CORS origin list ──────────────────────────────────────────────────────────
// Set CORS_ORIGIN in .env to restrict origins in production, e.g.
// CORS_ORIGIN=https://your-frontend.com
// Multiple origins can be comma-separated: CORS_ORIGIN=https://a.com,https://b.com
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : '*'; // Allow all in development by default

const corsOptions = {
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: corsOrigin !== '*',
};

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// ─── MongoDB ───────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/healpath')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// ─── HTTP Routes (REST) ────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/history', require('./routes/history'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/doctor-revenue', require('./routes/doctorRevenue'));
app.use('/api/admin', require('./routes/admin'));
// Payments integration removed
// ─── Socket.io Setup ───────────────────────────────────────────────────────────
// We wrap the Express app in a plain HTTP server so Socket.io can attach to it.
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: corsOptions,
});

// Track userId → socketId for targeted delivery
const userSocketMap = {};  // { userId: socketId }

// Health endpoint to check if a given user is currently connected via Socket.io
app.get('/api/calls/online/:userId', auth, async (req, res) => {
  const userId = req.params.userId
  if (!userId) return res.status(400).json({ online: false })
  if (String(req.user.id) === String(userId)) return res.json({ online: true })
  if (req.user.role === 'patient') {
    const patient = await Patient.findOne({ email: req.user.email });
    const allowed = patient && await Appointment.exists({ patient: patient._id, doctor: userId });
    if (!allowed) return res.status(403).json({ msg: 'You do not have a relationship with this user' });
  } else if (req.user.role === 'doctor') {
    const allowed = await Appointment.exists({ doctor: req.user.id, patient: userId });
    if (!allowed) return res.status(403).json({ msg: 'You do not have a relationship with this user' });
  } else if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Not authorized' });
  }
  const online = Boolean(userSocketMap[userId])
  return res.json({ online })
})

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET).user;
    next();
  } catch (err) {
    next(new Error('Invalid authentication token'));
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // ── Register ──────────────────────────────────────────────────────────────────
  // The frontend sends 'register' right after connecting so we can map
  // a logged-in user's MongoDB _id to their live socket.
  socket.on('register', () => {
    const normalizedUserId = socket.user.id.toString();
    userSocketMap[normalizedUserId] = socket.id;
    socket.join(normalizedUserId);
    console.log(`[Socket.io] Registered userId=${normalizedUserId} -> socketId=${socket.id}`);
  });

  // ── Disconnect ────────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    // Remove the mapping so stale socket IDs aren't stored
    for (const [uid, sid] of Object.entries(userSocketMap)) {
      if (sid === socket.id) {
        delete userSocketMap[uid];
        console.log(`[Socket.io] Unregistered userId=${uid}`);
        break;
      }
    }
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// ─── Serve frontend build when present (single-URL deployment)
const path = require('path');
const fs = require('fs');
const frontDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontDist)) {
  console.log('Serving frontend from', frontDist);
  app.use(express.static(frontDist));

  // Fallback to index.html for SPA routes (after API routes above)
  app.get(/.*/, (req, res) => {
    // Only handle non-API routes here
    if (req.path.startsWith('/api')) return res.status(404).send('Not Found');
    res.sendFile(path.join(frontDist, 'index.html'));
  });
}

// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8000;

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[Server] ERROR: Port ${PORT} is already in use. Is another instance of the server running?`);
    console.error('[Server] To kill the existing process, run: kill -9 $(lsof -t -i:' + PORT + ')');
  } else {
    console.error('[Server] HTTP server error:', err);
  }
  process.exit(1);
});

httpServer.listen(PORT, () => console.log(`Server + Socket.io running on port ${PORT}`));
startAppointmentReminders();

// ─── Global Error Handlers ─────────────────────────────────────────────────────
// Prevent silent crashes from unhandled promise rejections or synchronous throws
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err);
  process.exit(1);
});