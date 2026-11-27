# Prumo — pacote integrado

Este pacote reúne a landing pública, a Mesa da Agência, o assistente híbrido, o mascote Pru e o backend Cloudflare.

## Estrutura
- `index.html`: landing page pública.
- `mesa.html`: Mesa da Agência, autenticação e assistente lateral.
- `pet/`: mascote Pru, sprites, animações e demonstração.
- `cloudflare/worker.js`: API de cadastro, login, saldo e chatbot híbrido com Workers AI.
- `cloudflare/schema.sql`: estrutura do banco Cloudflare D1.
- `cloudflare/wrangler.toml`: configuração para publicar o Worker com Wrangler.
- `GUIA-PUBLICACAO-GITHUB-CLOUDFLARE.md`: guia de publicação e atualização.
- `CHECKLIST-ANTES-DO-DEPLOY.txt`: lista de conferência.

## Chatbot híbrido
1. O Worker verifica se a mensagem corresponde a uma pergunta frequente cadastrada. Se corresponder, responde pela FAQ local.
2. Se não corresponder, envia o histórico recente ao Workers AI usando o modelo configurado em `AI_MODEL`.
3. As duas modalidades consomem 1 crédito por mensagem. A cota é validada no D1, no servidor.
4. Cada usuário tem 2 créditos por dia, renovados segundo `America/Fortaleza`.
5. A abertura do chat e o comando `/pet` não consomem créditos.

O chatbot não usa a API da OpenAI e não exige `OPENAI_API_KEY`. O modelo padrão é `@cf/zai-org/glm-4.7-flash`; a disponibilidade, os limites e a franquia gratuita dependem das condições atuais da Cloudflare.

## Pru opcional
- O mascote é exibido na Mesa após o login, se não tiver sido ocultado anteriormente.
- A ação **Suma** faz o Pru desaparecer com partículas de poeira.
- Digite `/pet` no chat para fazê-lo reaparecer.
- A preferência de ocultar o Pru fica salva no navegador até chamar `/pet`.
- `/pet` é local, não chama o modelo e não consome crédito.

## Segurança e dados
- Senhas são armazenadas com PBKDF2, salt individual e 180.000 iterações.
- Tokens de sessão são assinados pelo Worker com `JWT_SECRET`.
- A contagem de créditos fica no D1 e não depende do contador visual do navegador.
- Nunca coloque `JWT_SECRET` ou outras credenciais em arquivos do GitHub.
- Os dados operacionais de campanhas e ferramentas da Mesa continuam no armazenamento local do navegador nesta versão. Faça backup antes de substituir arquivos ou limpar dados do navegador.

## Recurso independente: geração de imagens
A ferramenta de geração de imagens do Editor é independente do chatbot. Ela mantém sua própria configuração de endpoint, modelo e chave temporária no navegador. A remoção da dependência da OpenAI aplica-se ao chatbot de texto; não significa que a ferramenta de imagem esteja automaticamente gratuita ou sem chave.

## Antes de publicar
O pacote ainda exige configuração na sua conta Cloudflare:
- criar ou selecionar um banco D1;
- executar `cloudflare/schema.sql` no banco;
- vincular `DB` e `AI` ao Worker;
- cadastrar `JWT_SECRET` como Secret;
- definir `ALLOWED_ORIGINS` com o domínio do site depois de publicá-lo;
- substituir a URL de exemplo em `mesa.html` por sua URL real do Worker.

Consulte o guia para seguir a sequência completa. A integração foi preparada, mas não foi publicada na sua conta e não pode ser considerada implantada até você executar esses passos.
