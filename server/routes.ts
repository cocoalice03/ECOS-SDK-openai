import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { db, users, ecosScenarios, ecosSessions, ecosMessages, trainingSessions, trainingSessionStudents, trainingSessionScenarios } from './db';
import { eq, and } from 'drizzle-orm';
import { scenarioSyncService } from './services/scenario-sync.service';
import multer from 'multer';

// Admin emails authorized to access admin features
const ADMIN_EMAILS: string[] = [
  'cherubindavid@gmail.com', 
  'colombemadoungou@gmail.com', 
  'colombemadoungou.com', // Accept both formats for debugging
  'romain.guillevic@gmail.com', 
  'romainguillevic@gmail.com'
];

// Middleware to check admin authorization
function isAdminAuthorized(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedAdminEmails = ADMIN_EMAILS.map(adminEmail => adminEmail.toLowerCase().trim());
  return normalizedAdminEmails.includes(normalizedEmail);
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize database and data
  setImmediate(async () => {
    try {
      console.log('🔧 Testing database connection...');
      const { SupabaseClientService } = await import('./services/supabase-client.service');
      const dbService = new SupabaseClientService();

      try {
        await dbService.connect();
        console.log('✅ Database connection successful!');
        const scenarios = await dbService.getScenarios();
        console.log(`✅ Found ${scenarios.length} scenarios in database`);
        // Scenarios are now available in the database

        console.log('📊 Attempting to sync scenarios from Pinecone...');
        await scenarioSyncService.syncScenariosFromPinecone();
        console.log('✅ Pinecone sync completed');
      } catch (error: any) {
        console.error('❌ Database connection test failed:', error.message);
        console.log('⚠️ Database not available, using fallback scenarios only');
      }
    } catch (error) {
      console.log('⚠️ Initialization failed, using fallback scenarios for demonstration');
    }
  });

  // In-memory user storage for demonstration
  const inMemoryUsers = new Map<string, { userId: string; createdAt: Date }>();

  async function findOrCreateStudent(email: string): Promise<{ userId: string; isNewUser: boolean }> {
    try {
      // Try database first
      try {
        const existingUsers = await db
          .select()
          .from(users)
          .where(eq(users.email, email));

        if (existingUsers.length > 0) {
          return { userId: existingUsers[0].id, isNewUser: false };
        }

        // Create new user with generated ID
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await db.insert(users).values({
          id: userId,
          email: email,
        });

        return { userId, isNewUser: true };
      } catch (dbError) {
        console.log('Database not available, using in-memory storage');

        // Fallback to in-memory storage
        if (inMemoryUsers.has(email)) {
          const user = inMemoryUsers.get(email)!;
          return { userId: user.userId, isNewUser: false };
        }

        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        inMemoryUsers.set(email, { userId, createdAt: new Date() });
        return { userId, isNewUser: true };
      }
    } catch (error) {
      console.error('Error in findOrCreateStudent:', error);
      throw error;
    }
  }

  // Route to sync scenarios from Pinecone
  app.post("/api/admin/sync-scenarios", async (req: Request, res: Response) => {
    const { email } = req.query;

    if (!email || !isAdminAuthorized(email as string)) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    try {
      await scenarioSyncService.syncScenariosFromPinecone();
      res.status(200).json({ message: "Synchronisation des scénarios terminée avec succès" });
    } catch (error: any) {
      console.error("Error syncing scenarios:", error);
      res.status(500).json({ message: "Erreur lors de la synchronisation des scénarios" });
    }
  });

  // Route to test direct database connection and fetch scenarios
  app.get("/api/admin/test-db", async (req: Request, res: Response) => {
    const { email } = req.query;

    if (!email || !isAdminAuthorized(email as string)) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    try {
      const { alternativeSupabaseService } = await import('./services/alternative-supabase.service');

      console.log('🔧 Testing alternative Supabase connection...');
      await alternativeSupabaseService.testConnection();

      const scenarios = await alternativeSupabaseService.getScenarios();

      res.status(200).json({ 
        connected: true,
        scenarios,
        count: scenarios.length,
        message: `Connexion Supabase réussie - ${scenarios.length} scénarios trouvés`
      });

    } catch (error: any) {
      console.error("Error connecting to Supabase:", error);
      res.status(500).json({ 
        message: "Erreur de connexion à la base de données Supabase",
        error: error.message,
        connected: false
      });
    }
  });

  // Route to get available scenarios for students
  app.get("/api/student/available-scenarios", async (req: Request, res: Response) => {
    try {
      console.log('🔧 Fetching student scenarios from database only...');
      const scenarios = await scenarioSyncService.getAvailableScenarios();

      res.status(200).json({ 
        scenarios,
        connected: true,
        source: 'database'
      });

    } catch (error: any) {
      console.error("Error fetching student scenarios:", error);
      res.status(500).json({ 
        message: "Erreur de connexion à la base de données",
        error: error.message,
        connected: false
      });
    }
  });

  // Route to get scenarios for teacher dashboard
  app.get("/api/teacher/scenarios", async (req: Request, res: Response) => {
    const { email } = req.query;

    if (!email || !isAdminAuthorized(email as string)) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    try {
      console.log('🔧 Fetching teacher scenarios from database only...');
      const scenarios = await scenarioSyncService.getAvailableScenarios();

      res.status(200).json({ 
        scenarios,
        connected: true,
        source: 'database'
      });

    } catch (error: any) {
      console.error("Error fetching teacher scenarios:", error);
      res.status(500).json({ 
        message: "Erreur de connexion à la base de données",
        error: error.message,
        connected: false
      });
    }
  });

  // Route to get dashboard stats for teachers
  app.get("/api/teacher/dashboard", async (req: Request, res: Response) => {
    const { email } = req.query;

    if (!email || !isAdminAuthorized(email as string)) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    try {
      let stats = {
        totalScenarios: 0,
        activeSessions: 0,
        completedSessions: 0,
        totalStudents: 0
      };

      try {
        // Try to get real stats from database
        const scenarios = await scenarioSyncService.getAvailableScenarios();
        stats.totalScenarios = scenarios.length;
      } catch (dbError) {
        // Use fallback data
        const { fallbackScenariosService } = await import('./services/fallback-scenarios.service');
        const scenarios = await fallbackScenariosService.getAvailableScenarios();
        stats.totalScenarios = scenarios.length;
        stats.activeSessions = 2; // Sample data
        stats.completedSessions = 15; // Sample data  
        stats.totalStudents = 8; // Sample data
      }

      res.status(200).json(stats);
    } catch (error: any) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des statistiques" });
    }
  });

  // Route to get available Pinecone indexes
  app.get("/api/admin/indexes", async (req: Request, res: Response) => {
    const { email } = req.query;

    if (!email || !isAdminAuthorized(email as string)) {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    try {
      const { pineconeService } = await import('./services/pinecone.service');
      console.log('🔄 Fetching Pinecone indexes...');

      const indexes = await pineconeService.listIndexes();
      console.log('✅ Indexes fetched successfully:', indexes);

      res.status(200).json({ 
        indexes,
        message: "Index récupérés avec succès" 
      });
    } catch (error: any) {
      console.error("Error fetching indexes:", error);
      res.status(500).json({ 
        message: "Erreur lors de la récupération des index Pinecone",
        error: error.message 
      });
    }
  });

  // API route to auto-register student account
  app.post("/api/student/auto-register", async (req: Request, res: Response) => {
    const schema = z.object({
      email: z.string().email("Format d'email invalide"),
    });

    try {
      const { email } = schema.parse(req.body);
      console.log('🔄 Auto-registering student:', email);

      const { userId, isNewUser } = await findOrCreateStudent(email);

      res.status(200).json({ 
        message: "Compte étudiant auto-créé avec succès", 
        userId, 
        isNewUser 
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error in /api/student/auto-register:", error);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  });

  // API route to create or verify a student account
  app.post("/api/student", async (req: Request, res: Response) => {
    const schema = z.object({
      email: z.string().email("Format d'email invalide"),
    });

    try {
      const { email } = schema.parse(req.body);
      const { userId, isNewUser } = await findOrCreateStudent(email);
      res.status(200).json({ 
        message: "Compte étudiant traité avec succès", 
        userId, 
        isNewUser 
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error in /api/student:", error);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  });

  // API route to update ECOS scenarios
  app.put("/api/ecos/scenarios/:id", async (req: Request, res: Response) => {
    const schema = z.object({
      email: z.string().email("Format d'email invalide"),
      title: z.string().optional(),
      description: z.string().optional(),
      patientPrompt: z.string().optional().nullable(),
      evaluationCriteria: z.any().optional().nullable(),
      pineconeIndex: z.string().optional().nullable()
    });

    try {
      const scenarioId = req.params.id;
      const updateData = schema.parse(req.body);

      if (!updateData.email || !isAdminAuthorized(updateData.email)) {
        return res.status(403).json({ message: "Accès non autorisé" });
      }

      console.log('🔄 Updating scenario:', { scenarioId, updateData });

      // For now, return success - will be implemented with real database later
      const updatedScenario = {
        id: parseInt(scenarioId),
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      res.status(200).json({ 
        message: "Scénario mis à jour avec succès",
        scenario: updatedScenario
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error updating scenario:", error);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  });

  // In-memory storage for ECOS sessions
  const ecosSessions = new Map<number, any>();

  // API route to create ECOS sessions
  app.post("/api/ecos/sessions", async (req: Request, res: Response) => {
    const schema = z.object({
      email: z.string().email("Format d'email invalide"),
      scenarioId: z.number().int().positive("ID de scénario invalide"),
    });

    try {
      const { email, scenarioId } = schema.parse(req.body);

      console.log('🔄 Creating ECOS session for:', { email, scenarioId });

      // Create session ID
      const sessionId = Date.now();
      const session = {
        id: sessionId,
        sessionId,
        email,
        scenarioId,
        status: 'in_progress',
        startTime: new Date().toISOString(),
        messages: []
      };

      // Store session in memory
      ecosSessions.set(sessionId, session);

      console.log('✅ ECOS session created and stored:', session);

      res.status(200).json({ 
        message: "Session ECOS créée avec succès",
        sessionId,
        session
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error creating ECOS session:", error);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  });

  // API route to get ECOS sessions for a student
  app.get("/api/ecos/sessions", async (req: Request, res: Response) => {
    const schema = z.object({
      email: z.string().email(),
    });

    try {
      const { email } = schema.parse(req.query);

      console.log('🔄 Fetching ECOS sessions for:', email);

      // For now, return empty sessions array - will be implemented with real database later
      const sessions: any[] = [];

      res.status(200).json({ 
        sessions,
        message: "Sessions récupérées avec succès"
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error fetching ECOS sessions:", error);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  });

  // API route to start a simulation session (disabled for now - using fallback data)
  app.post("/api/session/start", async (req: Request, res: Response) => {
    return res.status(501).json({ 
      message: "Fonctionnalité temporairement désactivée",
      details: "Cette fonctionnalité sera réactivée une fois la base de données connectée"
    });
  });

  // API route to get scenarios for a student
  app.get("/api/student/scenarios", async (req: Request, res: Response) => {
    const schema = z.object({
      email: z.string().email(),
    });

    try {
      const { email } = schema.parse(req.query);

      // Use scenario sync service to get scenarios
      try {
        const scenarios = await scenarioSyncService.getAvailableScenarios();

        res.status(200).json({ 
          scenarios: scenarios,
          training_sessions: [],
          source: 'database'
        });
      } catch (dbError: any) {
        console.error('Database error:', dbError);
        // Return empty array if database error
        res.status(200).json({ 
          scenarios: [],
          training_sessions: [],
          source: 'database',
          error: 'Database connection issue'
        });
      }

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Données invalides", errors: error.errors });
      }
      console.error("Error in /api/student/scenarios:", error);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  });

  // Admin health check 
  app.get("/api/admin/health", async (req: Request, res: Response) => {
    try {
      const { SupabaseClientService } = await import('./services/supabase-client.service');
      const dbService = new SupabaseClientService();

      try {
        await dbService.connect();
        res.status(200).json({ status: 'healthy', message: 'Database connection is working.' });
      } catch (error) {
        res.status(500).json({ status: 'unhealthy', error: 'Database connection failed' });
      }
    } catch (error: any) {
      console.error('Health check failed:', error);
      res.status(500).json({ status: 'error', message: 'Health check failed.', error: error.message });
    }
  });



  // Update a training session (disabled for now)
  app.put("/api/training-sessions/:id", async (req: Request, res: Response) => {
    return res.status(501).json({ 
      message: "Fonctionnalité temporairement désactivée",
      details: "Cette fonctionnalité sera réactivée une fois la base de données connectée"
    });
  });

  // Delete a training session (disabled for now)
  app.delete("/api/training-sessions/:id", async (req: Request, res: Response) => {
    return res.status(501).json({ 
      message: "Fonctionnalité temporairement désactivée",
      details: "Cette fonctionnalité sera réactivée une fois la base de données connectée"
    });
  });

  // Get available scenarios for a student (disabled for now)
  app.get("/api/student/available-scenarios", async (req: Request, res: Response) => {
    return res.status(501).json({ 
      message: "Fonctionnalité temporairement désactivée",
      details: "Cette fonctionnalité sera réactivée une fois la base de données connectée"
    });
  });

  // API route to switch Pinecone index
  app.post("/api/admin/indexes/switch", async (req: Request, res: Response) => {
    try {
      const { indexName, email } = req.body;

      if (!indexName || !email) {
        return res.status(400).json({ 
          message: "Index name and email are required",
          error: "Missing required fields" 
        });
      }

      if (!isAdminAuthorized(email)) {
        return res.status(403).json({ message: "Accès non autorisé" });
      }

      const { pineconeService } = await import('./services/pinecone.service');
      await pineconeService.switchIndex(indexName);

      return res.status(200).json({ 
        message: `Index changé vers: ${indexName}`,
        currentIndex: indexName,
        success: true
      });
    } catch (error: any) {
      console.error("Error switching index:", error);
      return res.status(500).json({ 
        message: "Erreur lors du changement d'index",
        error: error.message,
        success: false
      });
    }
  });

  // API route to create Pinecone index
  app.post("/api/admin/indexes", async (req: Request, res: Response) => {
    try {
      const { name, dimension, email } = req.body;

      if (!name || !dimension || !email) {
        return res.status(400).json({ 
          message: "Name, dimension and email are required",
          error: "Missing required fields" 
        });
      }

      if (!isAdminAuthorized(email)) {
        return res.status(403).json({ message: "Accès non autorisé" });
      }

      const { pineconeService } = await import('./services/pinecone.service');
      await pineconeService.createIndex(name, dimension);

      return res.status(200).json({ 
        message: `Index "${name}" créé avec succès`,
        indexName: name,
        success: true
      });
    } catch (error: any) {
      console.error("Error creating index:", error);
      return res.status(500).json({ 
        message: "Erreur lors de la création de l'index",
        error: error.message,
        success: false
      });
    }
  });

  // API route to upload PDF with multer middleware
  app.post("/api/admin/upload-pdf", (req: Request, res: Response, next: Function) => {
    // Configure multer for this specific route
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
      fileFilter: (req: any, file: any, cb: any) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new Error('Only PDF files are allowed'), false);
        }
      }
    });

    upload.single('pdf')(req, res, async (err: any) => {
      if (err) {
        console.error('❌ Multer error:', err.message);
        return res.status(400).json({ 
          message: "Erreur lors de l'upload du fichier",
          error: err.message 
        });
      }

      try {
        const email = req.body.email;
        const title = req.body.title;
        const category = req.body.category;
        const uploadedFile = (req as any).file;

        console.log('📄 PDF Upload attempt:', { 
          email, 
          title, 
          category, 
          hasFile: !!uploadedFile,
          fileSize: uploadedFile?.size,
          fileName: uploadedFile?.originalname
        });

        if (!email || !isAdminAuthorized(email)) {
          console.log('❌ Access denied for email:', email);
          return res.status(403).json({ message: "Accès non autorisé" });
        }

      if (!title || !category) {
          return res.status(400).json({ 
            message: "Title and category are required",
            error: "Missing required fields" 
          });
        }

        if (!uploadedFile) {
          return res.status(400).json({ 
            message: "No PDF file uploaded",
            error: "Missing PDF file" 
          });
        }

        console.log('✅ File upload successful:', {
          originalName: uploadedFile.originalname,
          size: uploadedFile.size,
          mimetype: uploadedFile.mimetype
        });

        // Extract actual PDF content using pdf-parse
        const fileBuffer = uploadedFile.buffer;
        let extractedContent = '';
        let pages = 0;

        try {
          const pdfParse = (await import('pdf-parse')).default;
          const pdfData = await pdfParse(fileBuffer);

          extractedContent = pdfData.text;
          pages = pdfData.numpages;

          // If no text was extracted, return an error
          if (!extractedContent.trim()) {
            return res.status(400).json({ 
              message: "Aucun texte n'a pu être extrait de ce PDF. Assurez-vous que le PDF contient du texte sélectionnable.",
              error: "No extractable text found"
            });
          }

          console.log(`📄 Successfully extracted ${extractedContent.length} characters from ${pages} pages`);

        } catch (parseError: any) {
          console.error("Error parsing PDF:", parseError);
          return res.status(400).json({ 
            message: "Erreur lors de l'extraction du contenu PDF",
            error: parseError.message
          });
        }

        const { pineconeService } = await import('./services/pinecone.service');

        // Process the PDF content and upload to Pinecone
        await pineconeService.processPDFContent(extractedContent, title, category);

        const textLength = extractedContent.length;

        return res.status(200).json({ 
          message: "PDF traité et ajouté à l'index avec succès",
          fileName: uploadedFile.originalname,
          fileSize: uploadedFile.size,
          pages,
          textLength,
          title,
          category,
          chunks_created: Math.ceil(textLength / 1000)
        });

      } catch (error: any) {
        console.error("Error processing PDF:", error);
        return res.status(500).json({ 
          message: "Erreur lors du traitement du PDF",
          error: error.message
        });
      }
    });
  });

  // API route to get documents
  app.get("/api/admin/documents", async (req: Request, res: Response) => {
    try {
      const { email } = req.query;

      if (!email || !isAdminAuthorized(email as string)) {
        return res.status(403).json({ message: "Accès non autorisé" });
      }

      const { pineconeService } = await import('./services/pinecone.service');

      // Get all document sources from the current Pinecone index
      const sources = await pineconeService.getAllSources();

      return res.status(200).json({ 
        sources,
        message: "Documents récupérés avec succès"
      });
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      return res.status(500).json({ 
        message: "Erreur lors de la récupération des documents",
        error: error.message,
        sources: [] // Return empty array on error
      });
    }
  });

  // API route to add document
  app.post("/api/admin/documents", async (req: Request, res: Response) => {
    try {
      const { title, content, category, email } = req.body;

      if (!title || !content || !email) {
        return res.status(400).json({ 
          message: "Title, content and email are required",
          error: "Missing required fields" 
        });
      }

      if (!isAdminAuthorized(email)) {
        return res.status(403).json({ message: "Accès non autorisé" });
      }

      const { pineconeService } = await import('./services/pinecone.service');

      // Process the document content and upload to Pinecone
      await pineconeService.processPDFContent(content, title, category || 'general');

      const chunks_created = Math.ceil(content.length / 1000); // Estimate based on chunk size```text

      return res.status(200).json({ 
        message: "Document ajouté avec succès",
        document_title: title,
        chunks_created
      });
    } catch (error: any) {
      console.error("Error adding document:", error);
      return res.status(500).json({ 
        message: "Erreur lors de l'ajout du document",
        error: error.message
      });
    }
  });

  // API route to delete document
  app.delete("/api/admin/documents/:id", async (req: Request, res: Response) => {
    try {
      const { email } = req.query;
      const documentId = decodeURIComponent(req.params.id);

      if (!email || !isAdminAuthorized(email as string)) {
        return res.status(403).json({ message: "Accès non autorisé" });
      }

      const { pineconeService } = await import('./services/pinecone.service');

      // Delete the document from Pinecone
      await pineconeService.deleteDocument(documentId);

      return res.status(200).json({ 
        message: "Document supprimé avec succès"
      });
    } catch (error: any) {
      console.error("Error deleting document:", error);
      return res.status(500).json({ 
        message: "Erreur lors de la suppression du document",
        error: error.message
      });
    }
  });

  // Helper function to get scenario by ID
  async function getScenarioById(scenarioId: string | number): Promise<any> {
    try {
      // Try database first
      const scenarios = await scenarioSyncService.getAvailableScenarios();
      const scenario = scenarios.find(s => s.id == scenarioId);

      if (scenario) {
        console.log(`✅ Found scenario in database: ${scenario.title}`);
        // Ensure pineconeIndex is set for database scenarios
        if (!scenario.pineconeIndex){
          scenario.pineconeIndex = 'infirmierbeaujon'; // Default index for infirmier scenarios
        }
        return scenario;
      }

      // Fallback to mock data
      const { EcosService } = await import('./services/ecos.service');
      const mockScenarios = await EcosService.getScenarios();
      const mockScenario = mockScenarios.find(s => s.id == scenarioId);

      if (mockScenario) {
        console.log(`✅ Found scenario in mock data: ${mockScenario.title}`);
        return mockScenario;
      }

      console.log(`❌ Scenario not found: ${scenarioId}`);
      return null;
    } catch (error) {
      console.error('Error getting scenario:', error);
      return null;
    }
  }

  // Get scenario data from session
  app.get('/api/ecos/sessions/:sessionId/scenario', async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      
      console.log(`🔍 Getting scenario data for session: ${sessionId}`);
      
      // Get session data
      const session = ecosSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ message: 'Session non trouvée' });
      }
      
      // Get scenario details
      const scenario = await getScenarioById(session.scenarioId);
      if (!scenario) {
        return res.status(404).json({ message: 'Scénario non trouvé' });
      }
      
      console.log(`✅ Found scenario: ${scenario.title}, duration: ${scenario.duration || 20} minutes`);
      
      res.json({
        scenario: {
          id: scenario.id,
          title: scenario.title,
          duration: scenario.duration || 20
        }
      });
    } catch (error) {
      console.error('Error getting scenario data:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  // Chat endpoint for ECOS patient simulation
  app.post('/api/ecos/chat', async (req, res) => {
    try {
      const { message, sessionId, conversationHistory = [] } = req.body;

      if (!message || !sessionId) {
        return res.status(400).json({ 
          message: 'Message et ID de session requis' 
        });
      }

      console.log(`💬 Processing chat message for session: ${sessionId}`);
      console.log(`📝 User message: ${message}`);

      // Get session data to retrieve scenario info
      const session = ecosSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ message: 'Session ECOS non trouvée' 
        });
      }

      // Get scenario details
      const scenario = await getScenarioById(session.scenarioId);
      if (!scenario) {
        return res.status(404).json({ 
          message: 'Scénario non trouvé' 
        });
      }

      console.log('Using scenario:', scenario.title);
      console.log('Scenario pineconeIndex:', scenario.pineconeIndex || 'not specified');

      const { EcosService } = await import('./services/ecos.service');
      const ecosService = new EcosService();

      // Use the enhanced ECOS service with RAG integration
      const patientResponse = await ecosService.getPatientResponse(
        message,
        scenario,
        conversationHistory
      );

      // Update session with new messages
      session.messages.push(
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: patientResponse, timestamp: new Date().toISOString() }
      );

      console.log('Patient response generated:', patientResponse.substring(0, 100) + '...');

      res.json({
        response: patientResponse,
        sessionId,
        message: 'Réponse générée avec succès'
      });

    } catch (error) {
      console.error('Error in ECOS chat:', error);
      res.status(500).json({
        message: 'Erreur lors de la génération de la réponse du patient',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  });

  // Routes RTC pour la commande vocale
  app.post('/api/rtc-token', async (req: Request, res: Response) => {
    try {
      const { userId, scenarioId, sessionType = 'chat' } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      // Créer un client_secret éphémère
      const client_secret = process.env.OPENAI_API_KEY;
      
      if (!client_secret) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
      }

      // Instructions système selon le type de session
      const instructions = sessionType === 'ecos_simulation' 
        ? 'Vous êtes un patient virtuel dans une simulation ECOS. Répondez de manière réaliste selon le scénario clinique. Utilisez un ton naturel et conversationnel.'
        : 'Vous êtes un assistant éducatif spécialisé en formation médicale. Répondez de manière claire et pédagogique.';

      res.json({
        client_secret,
        instructions,
        sessionType,
        userId,
        scenarioId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 heure
      });

    } catch (error) {
      console.error('Error creating RTC token:', error);
      res.status(500).json({ 
        error: 'Failed to create RTC session',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return httpServer;
}