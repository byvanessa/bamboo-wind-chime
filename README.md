# Tilim 風鈴

**Uma companhia de pausa e foco.** Um carrilhão de vento interativo para
deixar aberto enquanto você trabalha — volte o olhar por alguns segundos,
toque de leve, organize o dia em post-its, e siga.

![Tilim — carrilhão sob o telhado, post-its e vagalumes no modo noturno](docs/screenshot.png)

## Funcionalidades

- **Cortina-carrilhão com física real** — até 28 fios de contas de vidro ou
  varetas de bambu (Matter.js); o mouse é o vento, um toque dedilha uma nota,
  arrastar puxa a cortina e ela volta balançando
- **Som 100% procedural** — síntese modal via Web Audio API (sem samples):
  bambu seco e curto, vidro cristalino e ressonante, afinados em escala
  pentatônica; pan estéreo, reverb e variação de pitch por toque
- **Post-its de tarefas** — título, descrição, status (pendente / em
  andamento / concluído com contorno brilhante), cores, papel envelhecido;
  arrastáveis com o mouse e persistidos no navegador, com contador diário
  de tarefas concluídas
- **Rastreamento de mão** (opcional, MediaPipe) — a mão vira o vento;
  sobre um post-it: mão aberta pega, mão fechada solta, "tchau" apaga
- **Pomodoro integrado** — a virada de fase soa como uma melodia no próprio
  carrilhão (ascendente ao entrar na pausa, descendente ao voltar ao foco),
  com uma rajada de vento; o timer usa tempo real e segue correto em
  segundo plano
- **Ambiente vivo** — rajadas automáticas de vento, paisagens sonoras em
  loop (vento, chuva, floresta — também sintetizadas), ciclo dia/noite com
  folhas caindo ou vagalumes, tigela cantante no hover prolongado
- **Responsivo** — desktop, tablet e mobile (toque = vento e dedilhada;
  controles migram para uma barra inferior compacta)

## Stack

| | |
| --- | --- |
| React + Vite | interface e build |
| Matter.js | física headless (pêndulos, correntes, colisões) |
| Framer Motion | motion values → transform na GPU, sem re-render |
| Web Audio API | síntese de sons e paisagens, sem assets de áudio |
| MediaPipe tasks-vision | rastreamento de mão e gestos |

Todos os visuais (telhado de telhas, bambu, vidro, texturas de papel) são
SVG/CSS procedurais — o projeto não depende de nenhuma imagem externa.

## Rodando

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # produção (dist/)
npm run preview  # serve o build
```

## Estrutura

```
src/
├── components/   # cena, telhado, cortina, post-its, painel, partículas
├── physics/      # mundo Matter + ponte física → motion values
├── input/        # mouse, toque, mão (gestos) — fonte única de ponteiro
├── audio/        # AudioEngine: sínteses, paisagens, sustain
├── hooks/        # pomodoro
├── config/       # escala/peças e materiais (visual + física + som)
└── state/        # estado global (material, tema, densidade, câmera…)
```
