# FMX — FÊNIX META SPECIFICATION v1.0.0

> **DOCUMENTO NORMATIVO SUPREMO DE META-ESPECIFICAÇÃO**
> A FMX (FÊNIX Meta Specification) é a norma suprema que rege como todas as especificações formais do ecossistema FÊNIX CEOS são redigidas, tipadas, versionadas, auditadas, validadas e evoluídas.

---

## 1. ESCOPO E AUTORIDADE

### Artigo 1.1 (Da Autoridade Meta-Normativa)
Nenhuma especificação formal (FAS, FPS, FGS, FOS, FES, FRS) possui validade no ecossistema FÊNIX CEOS se não for estritamente conforme às regras declaradas nesta FMX.

### Artigo 1.2 (Da Hierarquia Normativa)
$$\text{FMX (Meta-Specification)} \succ \text{CONSTITUIÇÃO (Level 0 \& 1)} \succ \text{SPECIFICATIONS (FAS, FPS, FGS, FOS, FES, FRS)} \succ \text{RUNTIME CONTRACTS} \succ \text{ARTIFACTS}$$

---

## 2. ESTRUTURA OBRIGATÓRIA DE UMA ESPECIFICAÇÃO FÊNIX

Toda especificação formal deve conter obrigatoriamente as seguintes seções estruturadas:

1. **Cabeçalho Ontológico**: Título, Identificador Único (ex: `FMX-001`, `FOS-001`), Versão Semântica (`MAJOR.MINOR.PATCH`), Status (`DRAFT`, `PROPOSED`, `STABLE`, `DEPRECATED`) e Data de Homologação.
2. **Preâmbulo & Escopo**: Declaração explícita das fronteiras operacionais e autoridade.
3. **Mapeamento no Universal Type System (UTS)**: Declaração dos tipos do UTS vinculados à especificação.
4. **Cláusulas Normativas**: Regras expressas escritas com verbos modais normativos (`MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, `MAY`).
5. **Esquema Executável de Validação**: Schema JSON ou definição formal que permite validação sintática e semântica autônoma pelo **Constitutional Compliance Engine (CCE)**.
6. **Matriz de Rastreadilidade & Evidências**: Vínculo formal a RFCs, Papers ou Benchmarks via **Evidence Engine**.
7. **Critérios de Descontinuação e Compatibilidade**: Regras para transição e depreciação sem quebra de ecossistema.

---

## 3. VERSIONAMENTO E COMPATIBILIDADE

### Artigo 3.1 (Da Regra SemVer FÊNIX)
- `MAJOR`: Alterações incompatíveis ou mudanças nos Axiomas (Level 0) ou Leis (Level 1). Requer aprovação do Conselho de Governança Estratégica e execução pelo Ecosystem Digital Twin.
- `MINOR`: Adição de novos protocolos, tipos ontológicos ou capacidades sem quebrar a compatibilidade regressiva.
- `PATCH`: Correções de documentação, refatoração de schemas ou ajustes em restrições não quebrandas.

### Artigo 3.2 (Da Reversibilidade)
Toda alteração de especificação deve obrigatoriamente manter a capacidade de *rollback* limpo registrada no **Evolution Ledger**.

---

## 4. CONFORMIDADE E AUDITORIA AUTÔNOMA

### Artigo 4.1 (Da Validação pelo Constitutional Compliance Engine)
Cada commit ou mutação de especificação aciona o CCE, que executa 3 verificações determinísticas:
1. **Conformidade de Estrutura**: Verificação se todos os 7 componentes obrigatórios estão presentes.
2. **Validação de Grafo**: Checagem no `Policy Graph` e `Dependency Graph` para garantir ausência de ciclos ou contradições normativas.
3. **Assinatura Ontológica Hash**: Emissão de um hash imutável SHA-256 no **Universal Architecture Registry**.

---

> **HOMOLOGADO E PROCLAMADO** como a Meta-Especificação Suprema do FÊNIX CEOS.
