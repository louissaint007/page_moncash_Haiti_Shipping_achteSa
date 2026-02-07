require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const MONCASH_API_URL = "https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware";

app.post('/api/create-payment', async (req, res) => {
    try {
        const { amount, orderId } = req.body;
        console.log(`[SERVER] Processing payment for Order: ${orderId}, Amount: ${amount} HTG`);

        const clientId = process.env.MONCASH_CLIENT_ID;
        const secretKey = process.env.MONCASH_SECRET_KEY;

        if (!clientId || !secretKey) {
            return res.status(500).json({ error: "MonCash API keys missing on server." });
        }

        // 1. Authenticate
        const credentials = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
        const authResponse = await axios.post(`${MONCASH_API_URL}/Authenticate`, {}, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Basic ${credentials}`
            }
        });

        const accessToken = authResponse.data.access_token;
        if (!accessToken) {
            throw new Error("Failed to get MonCash access token.");
        }

        // 2. Create Payment
        const paymentResponse = await axios.post(`${MONCASH_API_URL}/Checkout/Payment`, {
            amount: amount,
            orderId: orderId
        }, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const paymentData = paymentResponse.data;

        if (!paymentData.payment_token || !paymentData.payment_token.token) {
            throw new Error(paymentData.status || 'Payment creation failed');
        }

        const paymentToken = paymentData.payment_token.token;
        const redirectUrl = `${MONCASH_API_URL}/Checkout/Process?token=${paymentToken}`;

        res.json({ url: redirectUrl });

    } catch (error) {
        console.error("[SERVER ERROR]", error.response ? error.response.data : error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[SERVER] Middleman site running on port ${PORT}`);
});
