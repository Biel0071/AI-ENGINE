# Design Engine

Gera e mantém a camada visual: design system consistente, reutilizável e acessível.

## O que gera

Design System · UI Kit · Componentes · Ícones · Design Tokens · Dark Mode · Light Mode ·
Responsividade · Acessibilidade (WCAG) · Microinterações · Animações · Protótipos.

## Modelo

```
DesignSystem (identidade visual base)
Token        (cor, tipografia, espaçamento, raio, sombra, motion) — fonte única de verdade
Component    (variantes, estados, a11y, doc, exemplos)
Theme        (mapeamento de tokens → light/dark; por tenant via White Label)
```

## Contratos (ports)

- `TokenProvider` — expõe tokens como fonte única (CSS vars / JSON) consumida por web/mobile.
- `ComponentLibrary` — catálogo de componentes com variantes e estados.
- `A11yChecker` — valida contraste, foco, roles, navegação por teclado.

## Regras

- **Tokens são a fonte da verdade**; componentes e temas derivam deles. Trocar marca = trocar tokens.
- Todo componente nasce acessível (contraste, foco visível, aria, teclado) e documentado.
- Dark/light são temas sobre os mesmos tokens, não CSS duplicado.
- Integra com White Label: o `Theme` do tenant sobrescreve tokens sem duplicar componentes.
- Componentes viram **capabilities de UI** reutilizáveis no catálogo.

## Integração

- **White Label**: `ThemeProvider` injeta os tokens do tenant.
- **App Factory**: mesma UI reaproveitada nos empacotamentos web/mobile/desktop.
- **Software Factory**: telas geradas consomem o UI Kit em vez de criar do zero.

## Saída

Design system versionado (tokens + componentes acessíveis + dark/light), UI Kit reutilizável e
protótipos, consistente entre todos os produtos e white labels.
