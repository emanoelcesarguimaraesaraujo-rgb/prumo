# Prumo — versão com Cloudflare Workers AI

Pacote com landing pública, Mesa da Agência, chatbot lateral, mascote Pru opcional e API.

## Estrutura
- `index.html`: landing pública.
- `mesa.html`: Mesa da Agência / Acesso da equipe.
- `pet/`: mascote Pru, animações e sprites.
- `cloudflare/worker.js`: cadastro, login, saldo diário e chatbot usando Cloudflare Workers AI.
- `cloudflare/schema.sql`: tabelas do banco D1.
- `cloudflare/wrangler.toml`: configuração do Worker, D1 e binding AI.

## Chatbot sem chave OpenAI
- O chatbot usa `env.AI` (Workers AI) diretamente no Worker. Não precisa de chave OpenAI nem de chave de outro provedor.
- Modelo padrão: `@cf/google/gemma-4-26b-a4b-it`.
- O limite do Prumo é de 2 mensagens por usuário/dia, aplicado no servidor com D1. O dia reinicia em `America/Fortaleza`.
- A Cloudflare oferece uma franquia gratuita diária limitada de Workers AI; não é uso ilimitado. O uso acima da franquia pode exigir plano pago.
- O secret `JWT_SECRET` continua necessário para assinar sessões de login; ele é uma senha interna do Worker, não uma chave de IA.

## Pru opcional
- O Pru aparece na Mesa depois do login, se não tiver sido dispensado.
- O botão **Suma** faz o mascote desaparecer com partículas quadradas.
- Para chamá-lo novamente, digite `/pet` no chatbot.
- `/pet`, abrir o chat e os comandos do mascote não consomem créditos.

## Publicação
Leia `LEIA-ANTES-DE-SUBSTITUIR-NO-GITHUB.md` e `GUIA-PUBLICACAO-GITHUB-CLOUDFLARE.md`. O upload dos arquivos no GitHub publica a parte estática quando Pages está conectado ao GitHub; o Worker e o D1 precisam de configuração/publicação separadas no painel Cloudflare.

## Nota sobre a Mesa incluída
A Mesa incluída neste pacote é a versão recuperada que acompanha o pacote original. Se você tiver uma versão local mais recente, faça backup e compare antes de substituir.
