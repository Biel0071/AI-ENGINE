const http = require('http');

/**
 * FÊNIX RUNTIME CLIENT
 * 
 * Classe utilitária para a CLI se comunicar com o Runtime Permanente.
 */
class RuntimeClient {
    constructor(port = 2150) {
        this.port = port;
        this.host = 'localhost';
    }

    async getManifest() {
        return this.request('GET', '/api/manifest');
    }

    async getHealth() {
        return this.request('GET', '/api/health');
    }

    async sendMission(missionData) {
        return this.request('POST', '/api/mission', missionData);
    }

    request(method, path, body = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.host,
                port: this.port,
                path: path,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(parsed);
                        } else {
                            reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
                        }
                    } catch (e) {
                        reject(new Error('Invalid JSON response from Runtime'));
                    }
                });
            });

            req.on('error', (err) => {
                // Se der ECONNREFUSED, o runtime está offline
                if (err.code === 'ECONNREFUSED') {
                    reject(new Error('RUNTIME_OFFLINE'));
                } else {
                    reject(err);
                }
            });

            if (body) {
                req.write(JSON.stringify(body));
            }
            req.end();
        });
    }
}

module.exports = RuntimeClient;
