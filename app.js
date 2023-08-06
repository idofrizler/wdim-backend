const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const OPENING_MESSAGE = "You are a helpful assistant that summarizes recent messages on thread in a few bullet points (with line breaks). There are potentially up to three parts to your response - a very concise summary of the messages starting with the prefix 'Summary:', a list of key dates mentioned starting with the prefix 'Key dates:', and a list of action items starting with the prefix 'Action items'.";

require('dotenv').config(); // Load environment variables from .env file

app.use(cors());
app.use(express.json());

// landing page
app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.post('/api/getSummary', async (req, res) => {
    console.log('Received request to get summary');
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });

        // Check if the fetch was successful
        if (!response.ok) {
            throw new Error(`OpenAI API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data && data.choices && data.choices[0] && data.choices[0].message) {
            res.send(data.choices[0].message);
        } else {
            throw new Error('Unexpected API response format');
        }

    } catch (error) {
        console.error('Error fetching summary:', error);
        // Sending a generic error message to the client for any failure
        res.status(500).send('Internal Server Error. Unable to generate summary.');
    }
});

const port = process.env.PORT || 3000; // use the environment variable PORT or, if nothing is provided, use 3000
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

