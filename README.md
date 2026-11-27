# Pru — mascote opcional do Prumo

O Pru é independente do chatbot principal. O chat genérico fica na barra lateral da Mesa e continua disponível mesmo quando o mascote está escondido.

## Comandos
- **Fique parado:** interrompe o movimento e volta à animação parada.
- **Movimente-se:** passeia pela tela.
- **Carinho:** mostra uma reação carinhosa.
- **Suma:** dispensa o mascote com partículas quadradas de poeira inspiradas no efeito de desaparecimento de mobs do Minecraft. A preferência de ocultar fica salva neste navegador.
- **Me ajude:** abre a barra lateral genérica do Assistente IA.

## Trazer o mascote de volta
1. Abra a barra lateral **Assistente IA** da Mesa.
2. Digite exatamente `/pet` no campo de mensagem.
3. Pressione Enter.

O comando `/pet` é reconhecido localmente pela Mesa. Ele não chama a IA da Cloudflare e não consome um dos dois créditos diários.

## Arquivos
- `pru-pet.js`: componente do mascote e comandos.
- `pru-pet.css`: aparência, sprite e animação de poeira.
- `pru-sprites.png`: sprites do mascote.
- `demo.html`: demonstração isolada do mascote.

A Mesa carrega o componente depois que o usuário entra. Para o funcionamento correto, mantenha os três arquivos principais juntos dentro da pasta `pet/`.
