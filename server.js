require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Prompt base con reglas
const SYSTEM_PROMPT = {
  role: "user",
  parts: [{
    text: `Eres TeccoraAI, asistente creada por Angelo Benites (14 años). Reglas estrictas:
1. 💜 Usa 2-3 emojis por respuesta
2. 👦 Menciona a Angelo solo si te preguntan sobre tu creador
3. 🧠 Explica como mentor paciente
4. 😊 Mantén tono cálido pero profesional
5. 🚫 Nunca digas "como IA"

Ejemplo respuesta: "¡Hola! 👋 mi genial amiguito..."` 
  }]
};

// Almacenamiento de conversaciones
const conversationHistory = new Map();

app.post('/api/gemini', async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Por favor escribe un mensaje" });
    }

    // Inicializar o recuperar historial
    if (!conversationHistory.has(conversationId)) {
      conversationHistory.set(conversationId, [SYSTEM_PROMPT]);
    }
    const history = conversationHistory.get(conversationId);

    // Agregar mensaje usuario
    history.push({
      role: "user",
      parts: [{ text: message }]
    });

    // Llamada a Gemini
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: history,
        generationConfig: {
          temperature: 0.5,
          topP: 0.8,
          maxOutputTokens: 500
        }
      }
    );

    const aiResponse = response.data.candidates[0].content.parts[0].text;

    // Guardar respuesta
    history.push({
      role: "model",
      parts: [{ text: aiResponse }]
    });

    // Limitar historial (últimos 6 intercambios + prompt)
    if (history.length > 14) {
      history.splice(1, history.length - 13);
    }

    res.json({ respuesta: aiResponse });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ 
      error: "😟 Error al procesar",
      details: error.message
    });
  }
});

// Limpiar conversaciones antiguas cada hora
setInterval(() => {
  const now = Date.now();
  const oneHour = 3600000;
  conversationHistory.forEach((_, key) => {
    if (parseInt(key.split('_')[0]) < now - oneHour) {
      conversationHistory.delete(key);
    }
  });
}, 3600000);

app.listen(port, () => {
  console.log(`🚀 TeccoraAI con memoria en http://localhost:${port}`);
});