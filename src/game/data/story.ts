import type { CharId } from "../types";

export const STAGE_INTRO: Record<string, string> = {
  "rain-street": "Porto Vésper. A chuva lava o sangue — a Hélice lava o resto.",
  metro: "O último comboio da noite. Ninguém desce por vontade própria.",
  roofs: "Telhas molhadas, atiradores no horizonte. Não olhe para baixo.",
  "hidden-yard": "Um pátio que o mapa da cidade esqueceu.",
  "forge-row": "A Alameda da Forja ainda ferve. O sindicato comprou o fogo.",
  "cinder-works": "Cinder Works. Aqui o metal grita mais alto que os homens.",
  blackwater: "Docas Blackwater. Contentores, dívidas e um chefe que não nada.",
  "glass-arcade": "A Galeria de Vidro vende luxo. Por trás do vidro, a Hélice.",
  "service-tunnels": "Túneis de serviço. O ar é ruim. A companhia, pior.",
  "hollow-blocks": "Blocos Ocos. Quem mora aqui já desistiu de ter nome.",
  "crown-spire": "Crown Spire. O topo da cidade. O fundo do poço.",
  "helix-nest": "Ninho da Hélice. Sem volta, sem testemunhas, sem desculpas.",
  dojo: "Piso de treino. Sem plateia. Só o golpe certo.",
};

export const CHAR_TAUNT: Record<CharId, string> = {
  kael: "Ainda dá tempo de ir embora.",
  vyra: "Corre. Eu gosto de perseguir.",
  rutger: "A forja não pede licença.",
  sien: "Postura. Depois, o resto.",
};

export const CHAR_WIN: Record<CharId, string> = {
  kael: "Ronda encerrada.",
  vyra: "Recado entregue.",
  rutger: "A rua aguenta. Vocês não.",
  sien: "Linha dourada, intacta.",
};

export const SECRET_LINES: Record<string, string> = {
  "rain-wall": "Um correio ferido aponta o beco. “Não é o metrô. É o pátio.”",
  "metro-door": "A porta de serviço range. Alguém deixou o cadeado aberto.",
  "roof-gap": "O salto atravessa o vão. Do outro lado, um ninho da Hélice.",
  "forge-valve": "A válvula corta o vapor. Um corredor aparece atrás da caldeira.",
  "cinder-mold": "O molde esconde uma ficha Ward antiga.",
  "dock-crate": "O contentor vazio não está vazio.",
  "mall-shutter": "A persiana do depósito sobe. Mannequins demais.",
  "hollow-npc": "Um morador: “Eles levam gente pelo átrio. Não pelo túnel.”",
  "spire-glass": "O vidro do Spire mostra o ninho — e o Sócio atrás dele.",
  "helix-core": "O núcleo pulsa. Uma chave sem dono cai no chão.",
};

export const TUTORIAL: { at: number; text: string }[] = [
  { at: 0.4, text: "WASD / setas — andar · Shift — correr" },
  { at: 3.2, text: "J soco · K chute · U agarrar · Espaço pular" },
  { at: 6.4, text: "O esquiva / guarda · L especial · I super" },
  { at: 9.4, text: "Quebre barris. Agarre e arremesse. Caminhos ↑ e ↓ mudam a fase." },
];
