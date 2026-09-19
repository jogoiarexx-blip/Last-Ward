# Publicar LAST WARD no GitHub Pages

Esta versão foi adaptada para funcionar como site estático.

## Opção recomendada: GitHub Actions

1. Envie todo o projeto para o repositório.
2. Vá em **Settings > Pages**.
3. Em **Build and deployment > Source**, selecione **GitHub Actions**.
4. Faça um push para a branch `main`.
5. O workflow em `.github/workflows/deploy-pages.yml` compila e publica a pasta `dist` automaticamente.

## Teste local

```bash
npm ci
npm run build
npm run preview
```

O build final fica em `dist/`.
