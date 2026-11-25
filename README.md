# Prumo — publicação e configuração

## Estrutura
- `index.html`: landing pública original, sem mascote.
- `mesa.html`: área interna; Pru só é montado depois do login.
- `pet/`: sprites originais fornecidos. O mascote e comandos estão no próprio HTML da Mesa.
- `cloudflare/`: Worker API e schema D1.

## Cloudflare
1. Crie um banco D1 chamado `prumo-db` no painel Cloudflare e copie o ID para `cloudflare/wrangler.toml`.
2. No terminal, instale Node.js e rode `npm install -g wrangler`, depois `wrangler login`.
3. Na pasta `cloudflare`, execute `wrangler d1 execute prumo-db --remote --file=schema.sql`.
4. Configure os segredos: `wrangler secret put OPENAI_API_KEY` e `wrangler secret put JWT_SECRET` (use uma string aleatória longa). Opcional: `wrangler secret put OPENAI_MODEL` com `gpt-4.1-mini` (ou configure como variável).
5. Execute `wrangler deploy`. Anote a URL `https://prumo-api.<sua-conta>.workers.dev`.
6. Em `mesa.html`, substitua `https://SEU-WORKER.workers.dev` em `window.PRUMO_API_URL` pela URL real.
7. Publique `index.html` e `mesa.html` juntos no Cloudflare Pages (upload direto ou conectando o repositório GitHub).

## GitHub
Crie um repositório, coloque todos os arquivos desta pasta na raiz e faça commit/push. No Cloudflare Pages, conecte o repositório, framework preset `None`, build command vazio e output directory `/` (raiz).

## Fluxo Pru
Após login online, o Pru aparece na Mesa. `Me ajude` abre o chat e mostra “Olá! No que posso ajudar?” sem consumir crédito. Cada mensagem enviada chama `POST /api/research` e desconta 1 crédito, até 2 por dia por conta. Os comandos de movimento, carinho e chibatada são locais. O Worker valida a cota no D1 e devolve o crédito se a chamada OpenAI falhar.

## Importante
- O modo de autenticação online é ativado quando a URL real do Worker é configurada. Sem isso, o HTML mantém o modo local legado, sem IA nem sincronização.
- A senha online exige 10 caracteres.
- A chave OpenAI nunca vai para o HTML; fica em Worker Secret.
- Para produção, restrinja `Access-Control-Allow-Origin` ao domínio Pages, implemente verificação de e-mail, recuperação de senha, rate limiting e política de privacidade. O Worker usa cota por data UTC.
- O D1 controla o limite por usuário no servidor; comandos locais não chamam a API.
