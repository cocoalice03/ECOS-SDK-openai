import { Router, Request, Response } from 'express';

const router = Router();

/**
 * POST /rtc-token
 * Crée un token éphémère pour l'API OpenAI Realtime
 */
router.post('/rtc-token', async (req: Request, res: Response) => {
  try {
    const { userId, scenarioId, sessionType = 'chat' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Créer un client_secret éphémère (en production, utiliser une vraie session OpenAI)
    // Pour le MVP, on renvoie directement la clé API avec un scope limité
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

/**
 * POST /api/rtc-tools/:sessionId
 * Endpoint pour les appels d'outils depuis la session Realtime
 */
router.post('/rtc-tools/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { tool_name, arguments: toolArgs } = req.body;

    let result;

    switch (tool_name) {
      case 'get_patient_info':
        // Récupérer les infos du patient depuis la DB
        result = await getPatientInfo(toolArgs.patient_id);
        break;
        
      case 'update_simulation_state':
        // Mettre à jour l'état de la simulation
        result = await updateSimulationState(sessionId, toolArgs.action, toolArgs.data);
        break;
        
      default:
        result = { error: `Unknown tool: ${tool_name}` };
    }

    res.json({ result });

  } catch (error) {
    console.error('Error executing tool:', error);
    res.status(500).json({ 
      error: 'Tool execution failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Fonctions helper pour les outils
async function getPatientInfo(patientId: string) {
  // Simuler la récupération d'infos patient
  return {
    id: patientId,
    name: "Patient Virtuel",
    age: 45,
    symptoms: ["douleur thoracique", "essoufflement"],
    medical_history: ["hypertension", "diabète type 2"]
  };
}

async function updateSimulationState(sessionId: string, action: string, data: any) {
  // Mettre à jour l'état de la simulation dans la DB
  console.log(`Simulation ${sessionId}: ${action}`, data);
  return { status: 'updated', action, timestamp: new Date() };
}

export default router;
