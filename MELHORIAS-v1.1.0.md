# Last Ward v1.1.0 — melhorias

- Loading visual antes de iniciar cada fase.
- Mensagem de erro amigável se assets da fase não carregarem.
- ResizeObserver para ajustar o canvas corretamente ao redimensionar e entrar em tela cheia.
- Limite de DPR em dispositivos de toque para reduzir custo de renderização.
- Botão de tela cheia durante a partida.
- Pausa automática ao trocar de aba/minimizar.
- Controles mobile detectados por tela de toque, inclusive em celular no modo paisagem.
- Aviso para girar o celular quando o jogo for aberto em retrato.
- Analógico virtual com knob visual e normalização radial.
- Opção de reduzir flashes/partículas/movimento nas configurações.
- Correção de listener de áudio acumulando ao reiniciar/trocar fases.
- Workflow do GitHub Pages sem cache npm dependente de lockfile.

## Observação de validação

A estrutura e as alterações foram revisadas localmente. A instalação npm no ambiente de análise não terminou dentro do limite disponível; o GitHub Actions continua responsável pelo build real do projeto.
