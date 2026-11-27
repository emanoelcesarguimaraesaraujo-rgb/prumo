# Prumo — substituição no GitHub

## 1. Enviar os arquivos
1. Baixe e extraia `PRUMO-GITHUB-PRONTO.zip`.
2. Abra a pasta `PRUMO-GITHUB-PRONTO` que foi extraída.
3. No repositório GitHub, envie o CONTEÚDO dessa pasta para a raiz (não envie o ZIP fechado e não envie a pasta externa como subpasta).
4. Confirme que `index.html` e `mesa.html` aparecem diretamente na raiz do repositório, junto das pastas `pet/` e `cloudflare/`.
5. Faça commit. Se o Cloudflare Pages estiver conectado ao GitHub, ele fará o deploy da parte estática. Se o projeto for Direct Upload, será preciso enviar os arquivos extraídos também pelo painel Pages.

## 2. O chatbot não usa OpenAI
O chatbot usa Cloudflare Workers AI pelo binding `AI`. Não cadastre `OPENAI_API_KEY` e não coloque chave de IA no HTML.

Ainda há configuração inicial necessária no Cloudflare para a parte online:
- Banco D1 vinculado como `DB`, com o SQL de `cloudflare/schema.sql` executado uma vez.
- Workers AI vinculado ao Worker com binding `AI`.
- Secret `JWT_SECRET` criado no Worker (pode ser uma senha longa aleatória; não é uma chave de IA).
- Worker publicado.

O arquivo `cloudflare/wrangler.toml` já declara o binding `AI`, o banco D1 e o modelo padrão `@cf/google/gemma-4-26b-a4b-it`. Se usar o painel Cloudflare, confira se o binding AI está criado com o nome exato `AI`.

## 3. Ligar a Mesa ao Worker
Depois de publicar o Worker, copie a URL `https://...workers.dev`. Em `mesa.html`, procure `window.PRUMO_CONFIG` e substitua o endereço de exemplo em `apiUrl` pela URL real do Worker. Faça commit dessa alteração.

## 4. O que fica funcionando
- Landing pública e link Acesso da equipe.
- Mesa com chatbot lateral.
- Cadastro/login online após configurar Worker e D1.
- 2 mensagens por usuário/dia, controladas no servidor.
- Pru opcional, botão Suma e comando `/pet` local.

**Importante:** o ZIP não pode publicar o Worker, criar o banco D1 ou descobrir a URL da sua conta Cloudflare sozinho. O upload do GitHub atualiza o site estático; a API é uma etapa separada.
