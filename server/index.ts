import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db, users } from "./db";
import { addDiagnosticRoutes } from "./diagnostic-endpoint";
import { createDebugMiddleware, createDatabaseErrorHandler } from "./debug.middleware";
import multer from 'multer';


// Simplified environment validation
function validateEnvironment() {
  const required = ['DATABASE_URL', 'OPENAI_API_KEY', 'PINECONE_API_KEY'];

  const missing = required.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.warn(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

const app = express();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add debug middleware
app.use(createDebugMiddleware());
app.use(createDatabaseErrorHandler());

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Test database connection - simple query
    const result = await db.select().from(users).limit(1);
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Ready endpoint
app.get('/ready', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  console.log('Starting LearnWorlds RAG Application...');

  // Validate environment
  validateEnvironment();

  // Setup diagnostic routes
  addDiagnosticRoutes(app);

  // Database initialization is now handled by Firebase Admin SDK.
  // The previous SQL-based table creation is no longer needed.
  console.log('Database connection managed by Firebase.');

  // Setup routes
  const server = await registerRoutes(app);

  // Security middleware for sensitive files
  app.use((req, res, next) => {
    const sensitivePaths = [
      '/.env', '/package.json', '/.replit', '/server', '/shared', '/scripts'
    ];

    if (sensitivePaths.some(path => req.path.startsWith(path))) {
      return res.status(404).json({ error: "Not Found" });
    }
    next();
  });

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(`Server Error [${status}]:`, message);
    res.status(status).json({ message });
  });

  // Setup frontend serving
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start server with error handling
  const port = parseInt(process.env.PORT || '80', 10);
  const host = '0.0.0.0';

  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Please stop any running servers and try again.`);
      process.exit(1);
    } else {
      console.error('Server error:', error.message);
      process.exit(1);
    }
  });

  server.listen(port, host, () => {
    console.log('Server started successfully');
    console.log(`Listening on http://${host}:${port}`);
    console.log(`Health check: http://${host}:${port}/health`);
    console.log(`Ready check: http://${host}:${port}/ready`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    server.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    server.close(() => process.exit(0));
  });

})().catch((error) => {
  console.error('Application startup failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});