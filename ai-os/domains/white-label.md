# White Label Engine

Transforma qualquer sistema gerado/conectado em produto white label, multiempresa.

## O que é configurável por tenant/org/cliente

Tema · Logo · Domínio (custom + SSL/DNS) · Cores · Idiomas (i18n) · Permissões (RBAC/ABAC) ·
Planos · Branding (nome, fontes, favicon, e-mails) · Módulos ativados · Marketplace · Plugins ·
Licenciamento · Multiempresa.

## Modelo

```
Brand      (nome, logo, cores, fontes, favicon, tom de voz)
Theme      (design tokens → ver Design Engine; light/dark)
Domain     (custom domain, DNS, SSL, roteamento por tenant)
Plan       (features incluídas, limites, preço) ── liga em Billing
License    (validade, seats, módulos permitidos)
ModuleSet  (capabilities ativadas para este tenant)
```

## Contratos (ports)

- `BrandingResolver` — resolve branding efetivo por tenant em runtime.
- `DomainBinder` — vincula domínio custom + SSL + roteamento isolado.
- `PlanGate` — habilita/bloqueia capability conforme plano/licença.
- `ThemeProvider` — injeta design tokens do tenant (integra Design Engine).

## Regras

- **Zero fork**: white label é configuração + tokens, nunca cópia do código-base.
- Isolamento total por tenant (dados, branding, domínio) — Postgres RLS.
- Ativar/desativar módulo = flip de flag no `ModuleSet`, sem redeploy do core quando possível.
- Licença expirada → `PlanGate` degrada com aviso, não quebra dados.
- Branding e domínio de um cliente **nunca** vazam para outro (auditar).

## Fluxo típico

```
sistema gerado (Software Factory)
 → criar Brand + Theme + Domain + Plan para o cliente
 → selecionar ModuleSet (capabilities do plano)
 → preview isolado no domínio custom
 → [aprovação] → produção white label
 → Billing começa a medir uso
```

## Saída

Instância white label isolada, com branding/domínio/planos próprios, cobrança ligada e
auditoria de isolamento — reutilizando 100% do core via configuração.
