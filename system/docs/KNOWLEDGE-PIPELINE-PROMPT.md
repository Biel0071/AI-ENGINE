Integrar pipeline de conhecimento completo com Docling + Qdrant na AI Engine.

OBJETIVO

Permitir que a engine:
- leia documentos estruturados
- armazene conhecimento vetorial
- recupere contexto relevante
- use esse contexto na geração de código

IMPLEMENTACAO
- integrar Docling para parsing de arquivos
- implementar chunking de conteúdo
- gerar embeddings
- armazenar no Qdrant
- buscar contexto antes de gerar código
- injetar contexto no prompt

RESULTADO

A engine deve:
- aprender com arquivos
- melhorar geração automaticamente
- entender padrões reais
