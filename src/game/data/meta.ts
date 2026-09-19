import type { CharId } from "../types";

export type UpgradeNode = {
  id: string;
  tree: "combat" | "defense" | "mobility" | "special" | "combos";
  name: string;
  desc: string;
  cost: number;
  req?: string[];
};

export const UPGRADES: Record<CharId, UpgradeNode[]> = {
  kael: [
    { id: "k-hp", tree: "defense", name: "Casca", desc: "+12 HP", cost: 2 },
    { id: "k-str", tree: "combat", name: "Punho Duro", desc: "+8% dano", cost: 2 },
    { id: "k-sp", tree: "special", name: "Fôlego", desc: "+15 energia", cost: 3, req: ["k-str"] },
    { id: "k-dash", tree: "mobility", name: "Passo do Cais", desc: "Corrida mais longa", cost: 2 },
    { id: "k-combo", tree: "combos", name: "Âncora", desc: "Desbloqueia combo secreto", cost: 4, req: ["k-str"] },
  ],
  vyra: [
    { id: "v-hp", tree: "defense", name: "Leve", desc: "+8 HP", cost: 2 },
    { id: "v-spd", tree: "mobility", name: "Relâmpago", desc: "+10% velocidade", cost: 2 },
    { id: "v-str", tree: "combat", name: "Corte Extra", desc: "+6% dano", cost: 2 },
    { id: "v-sp", tree: "special", name: "Flash", desc: "Especial recarrega mais rápido", cost: 3 },
    { id: "v-combo", tree: "combos", name: "Rota Fantasma", desc: "Combo secreto", cost: 4, req: ["v-spd"] },
  ],
  rutger: [
    { id: "r-hp", tree: "defense", name: "Couraça", desc: "+18 HP", cost: 2 },
    { id: "r-gr", tree: "combat", name: "Torno", desc: "Agarrões +20%", cost: 3 },
    { id: "r-def", tree: "defense", name: "Lastro", desc: "+10% defesa", cost: 2 },
    { id: "r-sp", tree: "special", name: "Sismo", desc: "Especial maior área", cost: 3 },
    { id: "r-combo", tree: "combos", name: "Prensa", desc: "Combo secreto", cost: 4, req: ["r-gr"] },
  ],
  sien: [
    { id: "s-hp", tree: "defense", name: "Centro", desc: "+10 HP", cost: 2 },
    { id: "s-rng", tree: "combat", name: "Alcance", desc: "+12% alcance", cost: 2 },
    { id: "s-sp", tree: "special", name: "Véu", desc: "Especial mais barato", cost: 3 },
    { id: "s-mob", tree: "mobility", name: "Passo", desc: "Esquiva mais longa", cost: 2 },
    { id: "s-combo", tree: "combos", name: "Oitava Forma", desc: "Combo secreto", cost: 4, req: ["s-rng"] },
  ],
};

export type Achievement = { id: string; name: string; desc: string; hidden?: boolean };

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-stage", name: "Primeira Rua", desc: "Complete sua primeira fase." },
  { id: "combo-25", name: "Aquecimento", desc: "Faça um combo de 25 golpes." },
  { id: "combo-50", name: "Fúria", desc: "Faça um combo de 50 golpes." },
  { id: "combo-100", name: "Lenda", desc: "Faça um combo de 100 golpes." },
  { id: "kills-100", name: "Bairro Limpo", desc: "Derrote 100 inimigos." },
  { id: "kills-1000", name: "Faxina Total", desc: "Derrote 1000 inimigos." },
  { id: "no-death", name: "Intocado", desc: "Termine uma fase sem morrer." },
  { id: "no-hit", name: "Fantasma", desc: "Complete uma área sem tomar dano." },
  { id: "finish", name: "Last Ward", desc: "Termine o modo História." },
  { id: "finish-arcade", name: "Créditos do Arcade", desc: "Termine o modo Arcade." },
  { id: "all-secrets", name: "Olhos Abertos", desc: "Encontre todos os segredos." },
  { id: "all-routes", name: "Cartógrafo", desc: "Descubra todas as rotas." },
  { id: "alt-bosses", name: "Dois Rostos", desc: "Derrote todos os chefes alternativos." },
  { id: "all-endings", name: "Quatro Noites", desc: "Veja todos os finais." },
  { id: "nightmare", name: "Pesadelo", desc: "Termine no modo Pesadelo." },
  { id: "boss-rush", name: "Fila", desc: "Complete o Boss Rush." },
  { id: "coop-clear", name: "Dupla", desc: "Termine uma fase em cooperativo." },
  { id: "grab-only", name: "Só as Mãos", desc: "Derrote 20 inimigos só com agarrões." },
  { id: "weapon-master", name: "Improviso", desc: "Use todas as armas." },
  { id: "s-rank", name: "S da Rua", desc: "Tire S em uma fase." },
  { id: "s-plus", name: "S+", desc: "Tire S+ em uma fase." },
  { id: "all-chars", name: "Quatro Punhos", desc: "Termine uma fase com cada personagem." },
  { id: "secret-stage", name: "Pátio", desc: "Encontre a fase secreta." },
  { id: "save-all", name: "Anjo da Rua", desc: "Salve todos os civis." },
  { id: "break-100", name: "Quebra-quebra", desc: "Destrua 100 objetos." },
];

export const CHALLENGES = [
  { id: "c30", name: "Trinta", desc: "Derrote 30 inimigos.", goal: 30, kind: "kills" as const },
  { id: "survive5", name: "Cinco Minutos", desc: "Sobreviva por 5 minutos.", goal: 300, kind: "time" as const },
  { id: "nohit", name: "Vidro", desc: "Complete uma área sem tomar dano.", goal: 1, kind: "nohit" as const },
  { id: "grabs", name: "Clínica", desc: "Derrote inimigos só com agarrões.", goal: 12, kind: "grabs" as const },
  { id: "combo50", name: "Cinquenta", desc: "Faça um combo de 50 golpes.", goal: 50, kind: "combo" as const },
  { id: "speed", name: "Relógio", desc: "Termine Rua da Chuva em 4 minutos.", goal: 240, kind: "speed" as const },
];

export const COLLECTIBLE_LORE: Record<string, { name: string; text: string }> = {
  "tape-01": { name: "Fita 01", text: "Um recado: 'A Hélice compra o metrô à meia-noite.'" },
  "poster-01": { name: "Cartaz Úmido", text: "Show cancelado. O bairro inteiro sabe por quê." },
  "ticket-01": { name: "Bilhete Rasgado", text: "Destino: Ninho. Carimbo apagado." },
  "tape-02": { name: "Fita 02", text: "Voz de Vex: 'Os trens não atrasam. As pessoas atrasam.'" },
  "poster-02": { name: "Cartaz do Telhado", text: "Procura-se Nim. Recompensa em silêncio." },
  "token-gold": { name: "Ficha de Ouro", text: "Arcade do Pátio. Ainda gira." },
  "doc-01": { name: "Ordem da Forja", text: "Apagar as luzes da Alameda se houver resistência." },
  "badge-01": { name: "Crachá Cinder", text: "Holt assina com cinza." },
  "log-01": { name: "Manifesto", text: "Carga: reforços para o Spire. Quinn ainda pode ser parado." },
  "mag-01": { name: "Revista Vidro", text: "O Rei Manequim não é vitrine. É dono." },
  "tape-03": { name: "Fita 03", text: "Serviço: 'não usem o átrio depois das onze.'" },
  "photo-01": { name: "Foto Queimada", text: "Mae ainda morava aqui. Alguém a tirou do quadro." },
  "card-01": { name: "Cartão Spire", text: "Ives: acesso penthouse. Só com sócio." },
  "chip-01": { name: "Chip Hélice", text: "Prime não é uma pessoa. É um cargo." },
  "ending-key": { name: "Chave Quente", text: "Abre o que a cidade finge que não existe." },
};
