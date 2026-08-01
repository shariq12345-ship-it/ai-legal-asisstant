const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Groq = require("groq-sdk");

const app = express();
const PORT = process.env.PORT || 5000;

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Temporary uploads folder
const upload = multer({ dest: 'uploads/' });

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Root Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Main API Route
app.post('/api/legal/process', upload.single('document'), async (req, res) => {
    try {
        const { mode, prompt } = req.body;
        let documentContent = '';

        // Handle uploaded file (PDF / DOCX / TXT)
        if (req.file) {
            const filePath = req.file.path;
            const originalName = req.file.originalname.toLowerCase();

            try {
                if (req.file.mimetype === 'application/pdf' || originalName.endsWith('.pdf')) {
                    const dataBuffer = fs.readFileSync(filePath);
                    const pdfData = await pdfParse(dataBuffer);
                    documentContent = pdfData.text;
                } else if (originalName.endsWith('.docx') || originalName.endsWith('.doc')) {
                    const result = await mammoth.extractRawText({ path: filePath });
                    documentContent = result.value;
                } else {
                    documentContent = fs.readFileSync(filePath, 'utf8');
                }
            } catch (err) {
                console.error("❌ File parsing error:", err);
            } finally {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath); // Clean up temp file
                }
            }
        }

        // Configure system instructions based on mode
        let systemInstruction = "";
        switch (mode) {
            case 'Simple English Translator':
            case 'translator':
                systemInstruction = `You are an expert legal translator. 
Translate and simplify complex legal jargon in the provided input or attached document into plain, easy-to-understand English. 
Format key clauses clearly with bullet points and simple summaries using clean HTML formatting (<p>, <ul>, <li>, <strong>, <h3>). Do not use markdown backticks like \`\`\`html.`;
                break;

            case 'Simple Document Builder':
            case 'builder':
                systemInstruction = `You are a professional legal document drafter. 
Draft a formal, legally structured document based on the user's prompt or reference document provided.
If essential details (like party names, dates, amounts, jurisdiction) are completely missing, ask the user specific questions to gather them first.
If sufficient details are available, output a complete, beautifully formatted legal document inside HTML tags (e.g., <h2>, <p>, <ul>, <li>, <strong>, <br>). 
Include placeholders like [Party Name], [Date], [Address] where relevant. Do NOT wrap output in markdown syntax like \`\`\`html.`;
                break;

            case 'AI chatbot':
            case 'Legal Assistant':
            case 'assistant':
            default:
                systemInstruction = `You are LexAI, a helpful AI legal assistant. Answer legal queries accurately, concisely, and clearly. Always include a brief standard legal disclaimer at the end. Use clean HTML formatting. Do not wrap output in markdown code blocks like \`\`\`html.`;
                break;
        }

        const fullPrompt = `${systemInstruction}\n\nUser Request/Prompt:\n${prompt || 'Please process the attached document/request.'}\n\n${documentContent ? 'Attached Document Text:\n' + documentContent : ''}`;

        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                {
                    role: "user",
                    content: fullPrompt,
                },
            ],
        });

        let rawResult = completion.choices[0]?.message?.content || "";

        // Clean up markdown block wrappers if present
        rawResult = rawResult
            .replace(/^```html\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/, '');

        return res.status(200).json({
            result: rawResult
        });

    } catch (error) {
        console.error('🔥 SERVER ERROR:', error);
        return res.status(500).json({ error: error.message || 'Server Error Occurred.' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 LexAI Backend active on http://localhost:${PORT}`);
});