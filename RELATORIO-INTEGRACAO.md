# Relatório de integração dos dois pacotes Prumo

## Arquivos usados como origem
- `Prumo-atualizado-com-chatbot-e-API.zip`: base principal para a landing `index.html`, a Mesa `mesa.html`, o mascote Pru, os sprites e o backend de autenticação com D1.
- `Prumo-AI-Cloudflare.zip`: referência para o fluxo híbrido FAQ + Workers AI, para o prompt institucional do assistente e para as respostas programadas.

## O que foi preservado
- Landing page e identidade visual da versão mais recente.
- Mesa da Agência, navegação, ferramentas, autenticação e chat lateral.
- Pru, sprites, animações, comandos locais, ação Suma e comando `/pet`.
- Banco D1, estrutura de contas e controle de créditos da versão mais recente.

## O que foi integrado ou corrigido
- Substituída a chamada ao endpoint da OpenAI no chatbot por `env.AI.run()` do Cloudflare Workers AI.
- Integrada a FAQ programada antes da chamada generativa.
- Mantido o contrato esperado pelo frontend: `/api/chat`, resposta `answer` e objeto `quota` com `used`, `limit` e `remaining`.
- Mantidas as rotas `/api/register`, `/api/login` e `/api/me`.
- Configurado o binding `AI` e o modelo padrão `@cf/zai-org/glm-4.7-flash`.
- Mantidos 2 créditos por usuário por dia, contados no D1 e com fuso `America/Fortaleza`.
- Falhas do Workers AI devolvem o crédito reservado.
- Atualizados README, checklist e guia de publicação.
- Corrigido texto da Mesa para explicar que a ferramenta de imagem é independente do chatbot.

## Compatibilidade de banco
O esquema consolidado usa `users.password_salt`, conforme o pacote mais recente. O pacote AI experimental usava `users.salt`, portanto não se deve misturar os dois schemas no mesmo banco sem migração. Se já houver contas no banco antigo, faça backup e valide as colunas antes de trocar o Worker. Se ainda não houver usuários reais, crie um D1 novo e execute `cloudflare/schema.sql`.

## Limites conhecidos
- A ferramenta de geração de imagens do Editor continua separada e pode exigir endpoint/chave de outro provedor.
- Os dados de trabalho da Mesa continuam no navegador; contas e créditos ficam no D1.
- O deploy real depende da conta Cloudflare do proprietário: Database ID, bindings, secret, URL do Worker e domínio Pages não podem ser preenchidos por quem não tem acesso à conta.
