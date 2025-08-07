import { evaluationService } from './evaluation.service';
// Firebase supprimé - utilisez PostgreSQL
// import { Pool } from 'pg';
import { openaiService } from './openai.service';
import { pineconeService } from './pinecone.service';

export class EcosService {
  static async getScenarios(): Promise<any[]> {
    // Retourner des données mockées temporairement
    return [
      { 
        id: '1', 
        title: 'ECOS Scénario 1', 
        type: 'clinical', 
        status: 'active', 
        createdAt: new Date().toISOString(), 
        exchanges: 5,
        pineconeIndex: 'infirmierbeaujon'
      },
      { 
        id: '2', 
        title: 'ECOS Scénario 2', 
        type: 'emergency', 
        status: 'active', 
        createdAt: new Date().toISOString(), 
        exchanges: 8,
        pineconeIndex: 'infirmierbeaujon'
      }
    ];
  }

  static async createSession(scenarioId: string, studentEmail: string): Promise<any> {
    // Mock temporaire
    return {
      id: `session_${Date.now()}`,
      scenarioId,
      studentEmail,
      status: 'active',
      startTime: new Date().toISOString()
    };
  }

  static async getSessions(studentEmail: string): Promise<any[]> {
    // Mock temporaire
    return [];
  }

  async getPatientResponse(
    userMessage: string,
    scenario: any,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<string> {
    try {
      console.log(`🧠 Generating patient response for scenario: ${scenario.title}`);
      console.log(`📋 Using Pinecone index: ${scenario.pineconeIndex || 'default'}`);

      // Step 1: Retrieve relevant knowledge from Pinecone
      let relevantContext = "";

      if (scenario.pineconeIndex) {
        try {
          console.log(`🔍 Querying Pinecone index: ${scenario.pineconeIndex}`);
          const ragContents = await pineconeService.queryVectors(
            userMessage + " " + scenario.title,
            scenario.pineconeIndex,
            3
          );

          if (ragContents && ragContents.length > 0) {
            relevantContext = ragContents
              .map(content => content.content)
              .join('\n\n');
            console.log(`✅ Retrieved ${ragContents.length} relevant documents from Pinecone`);
            console.log(`📄 Context preview: ${relevantContext.substring(0, 200)}...`);
          } else {
            console.log(`⚠️ No relevant documents found in index: ${scenario.pineconeIndex}`);
          }
        } catch (error) {
          console.error(`❌ Error querying Pinecone index ${scenario.pineconeIndex}:`, error);
          // Continue without RAG context
        }
      } else {
        // Fallback to default index
        try {
          console.log(`🔍 Using default Pinecone index for RAG search`);
          const ragContents = await pineconeService.searchRelevantContent(
            userMessage + " " + scenario.title,
            3
          );

          if (ragContents && ragContents.length > 0) {
            relevantContext = ragContents
              .map(content => content.content)
              .join('\n\n');
            console.log(`✅ Retrieved ${ragContents.length} relevant documents from default index`);
          }
        } catch (error) {
          console.error(`❌ Error querying default Pinecone index:`, error);
        }
      }

      // Step 2: Build conversation context
      const conversationContext = conversationHistory
        .slice(-5) // Keep last 5 exchanges for context
        .map(msg => `${msg.role === 'user' ? 'Étudiant' : 'Patient'}: ${msg.content}`)
        .join('\n');

      // Step 3: Create patient prompt
      const systemPrompt = `Tu es un patient virtuel dans une simulation médicale ECOS (Examen Clinique Objectif Structuré).

CONTEXTE DU SCÉNARIO:
${scenario.description}

PROMPT DU PATIENT:
${scenario.patientPrompt || 'Vous êtes un patient qui présente les symptômes décrits dans le scénario.'}

${relevantContext ? `CONNAISSANCES MÉDICALES PERTINENTES:
${relevantContext}

Utilise ces informations pour enrichir tes réponses de patient, mais reste toujours dans le rôle du patient.` : ''}

INSTRUCTIONS IMPORTANTES:
- Réponds UNIQUEMENT en tant que patient, jamais en tant que médecin ou expert médical
- Utilise un langage simple et naturel, comme le ferait un vrai patient
- Ne donne JAMAIS de diagnostic médical ou de conseils médicaux
- Décris tes symptômes de manière subjective (ce que tu ressens)
- Sois cohérent avec l'histoire du patient décrite dans le scénario
- Si l'étudiant pose une question technique, réponds en tant que patient qui ne comprend pas les termes médicaux
- Montre de l'inquiétude ou de l'anxiété appropriée selon la situation
- Utilise des expressions comme "j'ai mal", "ça me fait souffrir", "je suis inquiet", etc.
- Adapte tes réponses à la question spécifique posée
- Sois réaliste dans tes descriptions de symptômes

${conversationContext ? `HISTORIQUE DE LA CONVERSATION:
${conversationContext}` : ''}

Question actuelle de l'étudiant: "${userMessage}"

Réponds maintenant à cette question spécifique en restant dans le rôle du patient.`;

      console.log('🤖 Generating response with OpenAI...');
      console.log('📝 System prompt length:', systemPrompt.length);

      const response = await openaiService.createCompletion({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 300
      });

      const patientResponse = response.choices[0].message.content;
      console.log('✅ Patient response generated:', patientResponse?.substring(0, 100) + '...');
      return patientResponse;
    } catch (error) {
      console.error("Error getting patient response:", error);
      throw new Error("Erreur lors de la génération de la réponse du patient");
    }
  }
}

export const ecosService = new EcosService();