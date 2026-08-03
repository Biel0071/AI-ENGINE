# FÊNIX OS - AI CITY 

Interface de visualização 3D construída em WebGL (Three.js) ou Unreal Engine que consome a API do `DigitalTwin`.

Cada container Docker, banco de dados ou Agente Autônomo é representado espacialmente.

## Fluxo
1. Conecta no `ws://localhost:4400/twin-stream`
2. Renderiza Prédio (Redis)
3. Renderiza Carros (Missions em voo)
4. Renderiza Alertas (Doctor)
