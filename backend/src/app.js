require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi   = require('swagger-ui-express');

const connectDB = require('./config/db');

// ────────────── Kết nối Database ──────────────
connectDB();

const app = express();

// ────────────── Middleware ──────────────
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ────────────── Swagger Docs ──────────────
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Music Evaluation Platform API',
      version: '1.0.0',
      description: 'API cho nền tảng đánh giá âm nhạc',
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ────────────── Routes ──────────────
app.use('/api/auth',    require('./routes/auth.routes'));
app.use('/api/tracks',  require('./routes/track.routes'));
app.use('/api/reviews', require('./routes/review.routes'));
app.use('/api/admin',   require('./routes/admin.routes'));
app.use('/api/users',   require('./routes/user.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', time: new Date() }));

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'Route không tồn tại' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Lỗi server' });
});

// ────────────── Start Server ──────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
  console.log(`📚 Swagger Docs: http://localhost:${PORT}/api/docs`);
});
