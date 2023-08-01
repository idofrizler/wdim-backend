const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const port = 3000;

const OPENING_MESSAGE = "You are a helpful assistant that summarizes recent messages on thread in a few bullet points (with line breaks). There are potentially up to three parts to your response - a very concise summary of the messages starting with the prefix 'Summary:', a list of key dates mentioned starting with the prefix 'Key dates:', and a list of action items starting with the prefix 'Action items'.";

require('dotenv').config(); // Load environment variables from .env file

app.use(cors());
app.use(express.json());

app.post('/api/getSummary', async (req, res) => {
    console.log('Received request to get summary')
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // Use environment variable
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.send(data.choices[0].message);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});