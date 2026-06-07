import express from 'express';
import cors from 'cors';
import majorRoutes from './routes/major.routes.js';
import courseRoutes from './routes/course.routes.js';
import textbookRoutes from './routes/textbook.routes.js';
import classRoutes from './routes/class.routes.js';
import planRoutes from './routes/plan.routes.js';
import queryRoutes from './routes/query.routes.js';
import importRoutes from './routes/import.routes.js';
import exportRoutes from './routes/export.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import { errorHandler } from './middleware/error.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/majors', majorRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/textbooks', textbookRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/import', importRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

export default app;
