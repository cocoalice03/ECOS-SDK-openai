import OpenAI from "openai";
import { RAGContent } from '../types';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "",
});

export class OpenAIService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "";
  }

  /**
   * Create a completion with custom system prompt (for ECOS evaluation)
   */
  async createCompletion(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
  }): Promise<any> {
    try {
      const response = await openai.chat.completions.create({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature || 0.5,
        max_tokens: params.max_tokens || 1000,
      });

      return response;
    } catch (error) {
      console.error("Error creating OpenAI completion:", error);
      throw new Error("Impossible de générer une réponse. Service indisponible.");
    }
  }

  /**
   * Convert natural language question to SQL query
   */
  async convertToSQL(question: string, schema: string): Promise<string> {
    try {
      console.log("Conversion SQL - Question reçue:", question);
      console.log("Conversion SQL - Schéma fourni:", schema.substring(0, 200) + "...");

      const prompt = `Tu es un expert en bases de données PostgreSQL. Convertis cette question en langage naturel en requête SQL valide.

Base de données PostgreSQL avec le schéma suivant :
${schema}

Question en français : ${question}

Instructions importantes :
- Génère uniquement une requête SELECT (pas d'INSERT, UPDATE, DELETE)
- Utilise la syntaxe PostgreSQL
- Utilise UNIQUEMENT les tables et colonnes listées dans le schéma ci-dessus
- ATTENTION: Dans la table 'exchanges' la colonne utilisateur s'appelle 'utilisateur_email' (PAS 'email')
- ATTENTION: Dans la table 'daily_counters' la colonne utilisateur s'appelle 'utilisateur_email' (PAS 'email')
- Pour les questions sur les utilisateurs connectés/actifs, utilise la table 'exchanges' avec la colonne 'utilisateur_email'
- Pour les compteurs quotidiens, utilise la table 'daily_counters' avec la colonne 'utilisateur_email'
- Pour les dates, utilise DATE(timestamp) = CURRENT_DATE pour aujourd'hui
- Pour compter les utilisateurs uniques: COUNT(DISTINCT utilisateur_email)
- Inclus les alias de tables si nécessaire
- Réponds uniquement avec la requête SQL, sans explication ni markdown

Requête SQL :`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Tu es un expert en conversion de langage naturel vers SQL. Réponds uniquement avec la requête SQL demandée, sans formatage markdown."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.1,
      });

      let sqlQuery = response.choices[0].message.content?.trim() || "";
      console.log("Réponse OpenAI brute:", sqlQuery);

      // Clean up the response - remove markdown if present
      sqlQuery = sqlQuery.replace(/```sql\s*/gi, '').replace(/```\s*/gi, '');

      // Extract SQL from response if it's wrapped in explanations
      const sqlMatch = sqlQuery.match(/(SELECT[\s\S]*?)(?:\n\s*$|$)/i);
      if (sqlMatch) {
        sqlQuery = sqlMatch[1].trim();
        console.log("SQL extrait:", sqlQuery);
      }

      // Remove trailing semicolon if present
      sqlQuery = sqlQuery.replace(/;\s*$/, '');

      // Basic validation
      if (!sqlQuery.toLowerCase().includes("select")) {
        console.log("Échec validation - pas de SELECT trouvé dans:", sqlQuery);
        throw new Error("Aucune requête SELECT valide trouvée dans la réponse");
      }

      // Additional validation - check if it starts with SELECT
      if (!sqlQuery.toLowerCase().trim().startsWith("select")) {
        console.log("Échec validation - ne commence pas par SELECT:", sqlQuery);
        throw new Error("La requête doit commencer par SELECT");
      }

      console.log("SQL final validé:", sqlQuery);
      return sqlQuery;
    } catch (error) {
      console.error("Error converting to SQL:", error);
      if (error instanceof Error) {
        throw new Error(`Impossible de convertir la question en requête SQL: ${error.message}`);
      }
      throw new Error("Impossible de convertir la question en requête SQL");
    }
  }



  /**
   * Check if OpenAI service is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }
}

export const openaiService = new OpenAIService();