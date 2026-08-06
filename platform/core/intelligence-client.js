require('dotenv').config();
const axios = require('axios');
const https = require('https');

class FenixIntelligenceClient {
    constructor() {
        this.baseUrl = process.env.FENIX_INTELLIGENCE_URL || 'https://209-50-241-215.sslip.io:8443';
        this.apiKey = process.env.FENIX_INTELLIGENCE_API_KEY;

        // Custom HTTPS agent to bypass self-signed certificate errors
        this.httpsAgent = new https.Agent({ rejectUnauthorized: false });
    }

    async _request(method, endpoint, data = null) {
        if (!this.apiKey) {
            console.warn("[FÊNIX] Alerta: FENIX_INTELLIGENCE_API_KEY não definida no .env. Rejeição possível.");
        }

        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            method,
            url,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey || ''
            },
            httpsAgent: this.httpsAgent,
            data
        };

        try {
            const response = await axios(config);
            return response.data;
        } catch (error) {
            const status = error.response ? error.response.status : 'UNKNOWN';
            const message = error.response?.data?.error || error.message;
            throw new Error(`[IntelligenceClient] Falha ao conectar no gateway (${status}): ${message}`);
        }
    }

    // --- Discovery Endpoints ---
    
    async system() {
        // Fallback for when the endpoint doesn't exist yet on the VPS
        try {
            return await this._request('GET', '/v1/system');
        } catch (e) {
            return { status: 'offline_or_unimplemented', latency: 0, models: [], queue: 0 };
        }
    }

    async capabilities() {
        try {
            return await this._request('GET', '/v1/capabilities');
        } catch (e) {
            // Fallback while the API is not updated
            return {
                reasoning: true,
                vision: true,
                image: true,
                embed: true,
                planner: false 
            };
        }
    }

    async models() {
        return this._request('GET', '/v1/models');
    }

    async providers() {
        return this._request('GET', '/v1/providers');
    }

    // --- Cognitive Endpoints ---

    async chat(messages, model = null, provider = null) {
        const payload = { messages };
        if (model) payload.model = model;
        if (provider) payload.provider = provider;
        return this._request('POST', '/v1/chat', payload);
    }

    async plan(payload) {
        // Espera-se { state, goal, constraints, capabilities, history, context }
        try {
            return await this._request('POST', '/v1/plan', payload);
        } catch (e) {
            // Mock fallback para não quebrar a missão enquanto o endpoint não existe
            return {
                plan: [
                    "Detectar ambiente atual e analisar State Graph",
                    "Aguardar implementação do orquestrador real na VPS"
                ],
                confidence: 0.5,
                risk: "high",
                estimatedTime: 0,
                requiredCapabilities: []
            };
        }
    }

    async reason(prompt) {
        return this._request('POST', '/v1/text', { prompt });
    }

    // --- Specific Modalities ---

    async vision(imagePayload, prompt) {
        return this._request('POST', '/v1/vision', { image: imagePayload, prompt });
    }

    async image(prompt) {
        return this._request('POST', '/v1/image', { prompt });
    }

    async embed(text) {
        return this._request('POST', '/v1/embed', { text });
    }
}

module.exports = FenixIntelligenceClient;
