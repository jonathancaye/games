# Mesa de Jogos

Pequenos jogos de mesa para jogar no navegador.

## Estrutura

```
index.html              ← hub (página inicial com a lista de jogos)
favicon.svg
.nojekyll
jogos/
  corrida-de-ases/index.html
  dados-6x6/index.html
  dice-wars/index.html
  scoundrel/index.html
  asfalto-turbo/index.html
  arrancada-402/index.html
```

## Publicar no GitHub Pages

1. Crie um repositório novo no GitHub (ex.: `jogos`), público.
2. Envie todos os arquivos desta pasta para a raiz do repositório
   (pelo site: **Add file → Upload files**, arrastando a pasta inteira, inclusive `.nojekyll`).
3. Vá em **Settings → Pages**, em *Source* escolha **Deploy from a branch**,
   branch `main`, pasta `/ (root)`, e salve.
4. Em 1–2 minutos o site fica no ar em `https://SEU-USUARIO.github.io/jogos/`.

## Adicionar um jogo novo

1. Crie a pasta `jogos/nome-do-jogo/` e coloque o jogo como `index.html`.
2. Cole antes de `</body>` o botão de voltar (copie o bloco `hub-back` de um dos jogos existentes).
3. No `index.html` da raiz, acrescente um item no array `GAMES`
   (título, url, descrição, categoria, jogadores, tempo, cor de destaque e arte).
   A categoria nova vira filtro automaticamente.
