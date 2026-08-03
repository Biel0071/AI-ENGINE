# FÊNIX OS - Desktop Client

Aplicativo Electron/Tauri que atua como interface visual primária (Painel Administrativo Local) conectando-se ao `RuntimeConsole` (porta 4400) ou ao socket IPC.

## Conexão com o Motor
O Desktop Client NÃO roda LLMs nem processa missões pesadas. Ele apenas envia Intents (intenções) para o FENIX Daemon e renderiza o Live Manifest (Digital Twin) na interface.
