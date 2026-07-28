# App Factory

Empacota um sistema (gerado ou conectado) para múltiplos destinos, a partir de uma base comum.

## Alvos de build

- **Android**: APK + AAB (assinados)
- **iOS**: IPA (assinatura + provisioning)
- **Desktop**: Electron, Tauri
- **PWA**: manifest + service worker + instalável
- **Extensões**: Chrome (MV3), Edge, Firefox

## Modelo

```
BuildTarget  (plataforma, canal, versão, flags)
Artifact     (binário/pacote versionado + checksum + storage)
Signing      (chaves/certificados por tenant, no Secrets Manager)
Release      (changelog, ambiente, rollout, rollback)
```

## Contratos (ports)

- `Packager` — adaptador por alvo (android/ios/electron/tauri/pwa/extension).
- `Signer` — assinatura com credenciais por tenant (nunca no repositório/cliente).
- `StoreConnector` — publicação (Play/App Store/Web Store) quando autorizado.

## Regras

- Base compartilhada (React/TS): o app reusa capabilities; cada alvo é um **adapter de empacotamento**.
- Chaves de assinatura no Secrets Manager por tenant — jamais em código ou navegador.
- Todo artefato é versionado, com checksum e evidência de build (commit + config).
- Publicação em loja exige autorização explícita (ação de efeito → auditoria).
- Rollout gradual + rollback para mobile/extension quando o canal suportar.

## Fluxo

```
sistema (com UI React) + BuildTarget
 → Packager por alvo → Artifact assinado (Signer)
 → canal de teste/preview → [aprovação] → StoreConnector (opcional)
 → Release registrado + memória atualizada
```

## Saída

Artefatos assinados e versionados por plataforma, prontos para distribuição, com trilha de
auditoria e rollback.
