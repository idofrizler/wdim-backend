const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const moment = require('moment');

const app = express();

require('dotenv').config(); // Load environment variables from .env file

app.use(cors());
app.use(express.json());

// Assuming you're storing user data somewhere like a database
// For simplicity, using an in-memory object
// This should be replaced with your actual data store
const userQuotas = {};

// Check the user's daily quota
const DAILY_LIMIT = 20;

const checkUserQuota = (userId) => {
    const today = moment.utc().format('YYYY-MM-DD');
    if (!userQuotas[userId]) {
        userQuotas[userId] = {
            lastAccessed: today,
            callCount: 0
        };
    } else if (userQuotas[userId].lastAccessed !== today) {
        userQuotas[userId].lastAccessed = today;
        userQuotas[userId].callCount = 0;
    }

    console.log(`User ${userId} has made ${userQuotas[userId].callCount} API calls today`);
    return userQuotas[userId].callCount < DAILY_LIMIT;
};

const verifyToken = async (token) => {
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`);
    const data = await response.json();
    if (data.aud !== process.env.GOOGLE_CLIENT_ID) {
        throw new Error('Invalid token audience');
    }
    if (!data.email) {
        throw new Error('Email scope was not granted or email is not verified.');
    }
    return data;
};

app.post('/api/getSummary', async (req, res) => {
    console.log('Received request to get summary');

    const token = req.body.metadata.token;

    if (!token) {
        return res.status(400).send('Token is required.');
    }

    let userId;
    let userEmail;
    try {
        const tokenData = await verifyToken(token);
        if (tokenData.aud !== process.env.GOOGLE_CLIENT_ID) {
            return res.status(401).send('Invalid token.');
        }
        userId = tokenData.sub;
        userEmail = tokenData.email;
    } catch (error) {
        return res.status(401).send('Token verification failed.');
    }


    if (!checkUserQuota(userId)) {
        return res.status(429).send('Daily quota exceeded.');
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body.gptBody)
        });

        // Increment the user's call count
        userQuotas[userId].callCount += 1;

        // Check if the fetch was successful
        if (!response.ok) {
            throw new Error(`OpenAI API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data && data.choices && data.choices[0] && data.choices[0].message) {
            const remainingQuota = DAILY_LIMIT - userQuotas[userId].callCount;
            console.log(`Generated summary for user ${userId} (${userEmail}); ${remainingQuota} daily API calls remaining`);
            res.json({
                message: data.choices[0].message,
                remainingQuota: remainingQuota
            });
        } else {
            throw new Error('Unexpected API response format');
        }

    } catch (error) {
        console.error('Error fetching summary:', error);
        // Sending a generic error message to the client for any failure
        res.status(500).send('Internal Server Error. Unable to generate summary.');
    }
});

// landing page for sanity check
app.get('/', (req, res) => {
    res.send('Hello World!');
});

const port = process.env.PORT || 3000; // use the environment variable PORT or, if nothing is provided, use 3000
app.listen(port, () => {
  console.log(`WDIM backend server listening on port ${port}`);
});