/**
 * FÊNIX OS TypeScript SDK
 * Pacote publicável via NPM para facilitar a construção de aplicações (Web, Mobile, Desktop)
 * ou novos Plugins que precisem interagir com o Daemon.
 */
class FenixClient {
  constructor(endpoint = 'http://localhost:4400') {
    this.endpoint = endpoint;
  }

  async status() {
    const res = await fetch(`${this.endpoint}/api/manifest`);
    return await res.json();
  }

  async submitMission(goalText) {
    const res = await fetch(`${this.endpoint}/api/mission`, {
      method: 'POST',
      body: JSON.stringify({ goal: goalText })
    });
    return await res.json();
  }
}

module.exports = { FenixClient };
