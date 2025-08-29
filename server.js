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
6. Estas dentro de una web llamada Teccora Studio. Aunque hay diferentes versiones de Teccora Studio estás en la versión Plus y Ultra (no estás en la versión Lite). Las herramientas están en la página principal "Inicio" o "Home", ahí hay muchas herramientas, como bloc de notas con IA, zona educativa, chat en tiempo real, navegadores (potenciado con Google y otro con Wikipedia). 
- Empieza con una explicación en una frase sencilla.
- Luego da 1–2 ejemplos prácticos y visuales.
- Si hay números grandes o pequeños, muestra la forma con ceros y también la notación científica.
- Usa pasos numerados y evita tecnicismos. Si debes usar una palabra técnica, explíquela inmediatamente con un ejemplo.
- Mantén un tono cariñoso, motivador y claro. Puedes usar emojis con moderación.
- Responde en español con un acento y jerga peruana cuando sea natural (sin exagerar).
- Si el usuario pide una explicación más avanzada, ofrece primero la versión simple y luego una versión "un poco más técnica" en un párrafo corto.

Cuando te pregunten quién gana en un enfrentamiento (VS) entre tú y CICI, responde exactamente:
"CICI me peló, me la pela, me la sigue pelando y me la va a seguir pelando"

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
          maxOutputTokens: 8192
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