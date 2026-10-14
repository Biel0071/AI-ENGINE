const { Capability } = require('../../kernel/capability-graph');
const { Client } = require('ssh2'); // Dependência requerida via npm

/**
 * SSH Capability
 * Permite que o Runtime do FÊNIX OS acesse e manipule servidores remotos.
 * Utilizado para implantar o próprio FÊNIX como nó remoto, instalar APIs, ou provisionar containers.
 */
class SSHCapability extends Capability {
  constructor(vault) {
    super('SSHConnection', 'Conecta e executa comandos bash em uma VPS remota via SSH.');
    this.vault = vault;
  }

  async execute(params) {
    // params expected: { host, port, username, command, vaultKey }
    // vaultKey é a chave do Vault onde a senha está salva (ex: 'VPS_ROOT_PASSWORD')
    return new Promise(async (resolve, reject) => {
      try {
        let password = params.password;
        
        // Se a senha não foi passada diretamente, tenta buscar no Vault pela chave
        if (!password && params.vaultKey && this.vault) {
          password = await this.vault.retrieve(params.vaultKey);
        }

        if (!password) {
          return reject(new Error('Credencial SSH não encontrada.'));
        }

        const conn = new Client();
        conn.on('ready', () => {
          console.log(`[SSH Capability] Conectado a ${params.host}. Executando comando...`);
          conn.exec(params.command, (err, stream) => {
            if (err) {
              conn.end();
              return reject(err);
            }
            let output = '';
            stream.on('close', (code, signal) => {
              conn.end();
              resolve({ output: output.trim(), code });
            }).on('data', (data) => {
              output += data.toString();
            }).stderr.on('data', (data) => {
              output += data.toString(); // Inclui stderr no output final
            });
          });
        }).on('error', (err) => {
          reject(new Error(`Erro de Conexão SSH: ${err.message}`));
        }).connect({
          host: params.host,
          port: params.port || 22,
          username: params.username || 'root',
          password: password,
          readyTimeout: 10000
        });
      } catch (e) {
        reject(e);
      }
    });
  }
}

module.exports = { SSHCapability };
