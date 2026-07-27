# Checklist de produção GRG FÊNIX

- [ ] `ops/doctor.sh` aprovado numa VPS Linux suportada com Docker rootless.
- [ ] OIDC/JWKS corporativo validado, MFA exigido pelo IdP e login local rejeitado.
- [ ] Secrets fornecidos externamente, permissões 0600 e rotação ensaiada.
- [ ] Provider de IA externo validado com retry, fallback e budget.
- [ ] Backup automático executado e restore validado em ambiente isolado.
- [ ] Deploy, smoke test e rollback reais aprovados com evidências.
- [ ] Worker, eleição de líder e recuperação após crash validados.
- [ ] Prometheus coletando; alertas e retenção aprovados.
- [ ] CodeQL, dependency audit e container scan sem vulnerabilidade crítica/alta aberta.
- [ ] SBOM anexado à release.
- [ ] Cobertura mínima de 95% comprovada no CI.
- [ ] Runbook de disaster recovery ensaiado e assinado pelo operador.

Enquanto existir item aberto, a release permanece Candidate e não pode ser chamada Production Ready.
