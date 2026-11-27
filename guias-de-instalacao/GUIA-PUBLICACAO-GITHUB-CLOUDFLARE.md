# Guia de publicação do Prumo — GitHub + Cloudflare

Este projeto tem duas partes: os arquivos estáticos (landing e Mesa) e a API (Worker + D1 + Workers AI). O chatbot não usa OpenAI nem exige chave de provedor.

## A. GitHub e Cloudflare Pages
1. Faça backup do repositório atual (GitHub → Code → Download ZIP).
2. Extraia o ZIP `PRUMO-GITHUB-PRONTO.zip`.
3. Envie o conteúdo da pasta `PRUMO-GITHUB-PRONTO` para a raiz do repositório. `index.html` deve ficar na raiz, não dentro de outra pasta.
4. Faça commit.
5. Se o Pages estiver conectado ao GitHub, confira em Workers & Pages → seu projeto Pages → Deployments se o commit novo foi publicado. Se for Direct Upload, envie os arquivos extraídos pelo painel Pages.
6. Abra a URL `*.pages.dev` e confira a landing. O link **Acesso da equipe** abre `mesa.html`.

## B. Criar o banco D1
1. No Cloudflare Dashboard, abra **Workers & Pages → D1 SQL Database**.
2. Crie um banco chamado `prumo-db`.
3. Abra o banco e execute o conteúdo de `cloudflare/schema.sql` no Console SQL. Faça isso uma única vez.
4. Copie o Database ID exibido no painel.

## C. Criar/configurar o Worker
1. Abra **Workers & Pages → Create → Worker** e crie `prumo-api` (ou abra o Worker já existente).
2. Publique o conteúdo de `cloudflare/worker.js` como código do Worker.
3. Em **Settings → Bindings**, adicione:
   - **D1 database**: variável/binding `DB`, banco `prumo-db`.
   - **Workers AI**: variável/binding `AI`.
4. Em **Settings → Variables and Secrets**, crie o secret `JWT_SECRET` com uma senha longa e aleatória. Não use uma senha que você utiliza em outros serviços. Esse secret protege as sessões de login; não é uma chave de IA.
5. Configure as variáveis se não estiver usando `wrangler.toml`:
   - `DAILY_CREDITS` = `2`
   - `APP_TIME_ZONE` = `America/Fortaleza`
   - `WORKERS_AI_MODEL` = `@cf/google/gemma-4-26b-a4b-it`
6. Salve e publique o Worker.
7. Teste `https://SUA-URL.workers.dev/api/health`. Deve retornar JSON com `ok: true`.

## D. Conectar a Mesa à API
1. Copie a URL pública do Worker, por exemplo `https://prumo-api.SUA-CONTA.workers.dev`.
2. No GitHub, abra `mesa.html` e edite a configuração no início do arquivo: `window.PRUMO_CONFIG = { apiUrl: "..." }`.
3. Substitua o endereço de exemplo pela URL real do Worker, mantendo `/api` fora do valor (a Mesa acrescenta as rotas).
4. Salve/commit e aguarde o novo deploy do Pages.

## E. Testar
1. Abra a landing e clique em **Acesso da equipe**.
2. Crie uma conta e entre.
3. Abra o chatbot lateral e envie uma mensagem.
4. Confira que o saldo cai de 2 para 1 e depois para 0.
5. No dia seguinte, o saldo reinicia segundo `America/Fortaleza`.
6. Digite `/pet` no chat para chamar o mascote; esse comando não consome crédito. O botão **Suma** o dispensa.

## Franquia e custos
Workers AI tem uma franquia gratuita diária limitada (atualmente 10.000 Neurons por dia na oferta gratuita documentada pela Cloudflare). Não é ilimitada: ao exceder a franquia, as chamadas podem falhar no plano gratuito. Verifique a página oficial de preços antes de aumentar o uso: https://developers.cloudflare.com/workers-ai/platform/pricing/

O limite de 2 mensagens por conta no Prumo é independente da franquia global da Cloudflare. Duas mensagens por usuário não garantem que o consumo total do projeto caiba sempre na franquia.

## Observações importantes
- Não crie nem cadastre `OPENAI_API_KEY`. O chatbot não utiliza OpenAI.
- `JWT_SECRET` é necessário para login seguro.
- A seção de geração de imagens do Editor é uma conexão externa opcional e separada; ela não é necessária para o chatbot nem para os recursos locais de criação de peças.
- A Mesa incluída foi recuperada de uma versão salva anteriormente. Compare com a versão mais recente que você tenha antes de substituir.
