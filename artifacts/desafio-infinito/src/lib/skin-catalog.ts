export type SkinRarity =
  | 'comum'
  | 'incomum'
  | 'rara'
  | 'epica'
  | 'lendaria'
  | 'ultralendaria'
  | 'mitica'
  | 'ultramítica'
  | 'celestial';

export interface SkinCatalogItem {
  id: string;
  name: string;
  kind: 'skin';
  rarity: SkinRarity;
  description: string;
  price: number;
  colors: [string, string];
  tone: string;
  look: string;
  hue: number;
}

export const SKIN_RARITIES: Array<{ id: SkinRarity; label: string; count: number }> = [
  { id: 'comum', label: 'Comum', count: 15 },
  { id: 'incomum', label: 'Incomum', count: 15 },
  { id: 'rara', label: 'Rara', count: 15 },
  { id: 'epica', label: 'Épica', count: 15 },
  { id: 'lendaria', label: 'Lendária', count: 15 },
  { id: 'ultralendaria', label: 'Ultralendária', count: 15 },
  { id: 'mitica', label: 'Mítica', count: 15 },
  { id: 'ultramítica', label: 'Ultramítica', count: 15 },
  { id: 'celestial', label: 'Celestial', count: 5 },
];

const legacySkins: SkinCatalogItem[] = [
  { id: 'aurora', name: 'Rastro Aurora', kind: 'skin', rarity: 'comum', description: 'Um rastro suave que acompanha cada salto.', price: 0, colors: ['#78f0cf', '#8068e9'], tone: 'green', look: 'trail', hue: 0 },
  { id: 'pixel', name: 'Moldura Pixel', kind: 'skin', rarity: 'rara', description: 'Partículas quadradas inspiradas nos fliperamas.', price: 900, colors: ['#ffd34d', '#ff8a5b'], tone: 'amber', look: 'pixel', hue: 28 },
  { id: 'comet-trail', name: 'Rastro de Cometa', kind: 'skin', rarity: 'epica', description: 'Um risco de luz azul acompanha seus passos.', price: 1750, colors: ['#65dcff', '#3876e8'], tone: 'blue', look: 'comet', hue: 178 },
  { id: 'aurora-pulse', name: 'Pulso Aurora', kind: 'skin', rarity: 'epica', description: 'Ondas verdes e violetas surgem durante a corrida.', price: 2300, colors: ['#78f0cf', '#8068e9'], tone: 'green', look: 'pulse', hue: 90 },
  { id: 'supernova', name: 'Supernova', kind: 'skin', rarity: 'lendaria', description: 'Partículas douradas para marcar corridas especiais.', price: 4800, colors: ['#ffd34d', '#ff8a5b'], tone: 'amber', look: 'nova', hue: 42 },
];

const generatedNames: Record<SkinRarity, string[]> = {
  comum: ['Brisa Verde', 'Poeira de Pixel', 'Faísca Menta', 'Trilha de Musgo', 'Nuvem de Algodão', 'Pingo de Orvalho', 'Papel Neon', 'Rastro de Lima', 'Luz de Vaga-lume', 'Folha Veloz', 'Bolha de Sabão', 'Areia Rosa', 'Tinta de Giz', 'Sopro Azul'],
  incomum: ['Circuito Cítrico', 'Chuva de Cereja', 'Névoa Turquesa', 'Fagulha Coral', 'Vórtice Pêssego', 'Lagoa Elétrica', 'Dança de Pétalas', 'Rastro de Âmbar', 'Pulsar Lilás', 'Fita Prisma', 'Gelo de Melancia', 'Pixel Tangerina', 'Cometa de Jade', 'Fumaça de Lavanda', 'Ritmo de Safira'],
  rara: ['Pixel Dourado', 'Lâmina Cobalto', 'Rastro Carmim', 'Arco de Quartzo', 'Chama Oceânica', 'Órbita Violeta', 'Pulso de Rubi', 'Raio de Jade', 'Névoa de Ametista', 'Trilha Solar', 'Faísca Ártica', 'Prisma de Cobre', 'Rosa Galáctica', 'Vento de Topázio'],
  epica: ['Cometa Boreal', 'Aurora em Expansão', 'Tempestade de Íris', 'Nebulosa Rubra', 'Dobra do Tempo', 'Fênix Digital', 'Prisma Abissal', 'Coração de Plasma', 'Rastro de Eclipse', 'Maré Estelar', 'Coroa de Raios', 'Véu de Cristal', 'Chama do Vazio'],
  lendaria: ['Supernova Dourada', 'Lenda Carmesim', 'Manto do Dragão', 'Céu em Chamas', 'Rastro do Titã', 'Trono Solar', 'Asa de Fênix', 'Coroa de Cometa', 'Tempestade Real', 'Véu do Eclipse', 'Luz de Valquíria', 'Prisma do Rei', 'Fúria de Órion', 'Constelação Viva'],
  ultralendaria: ['Ruptura Estelar', 'Reator Infinito', 'Pulso do Colosso', 'Fenda Carmesim', 'Coroa de Plasma', 'Vórtice Primordial', 'Eclipse Absoluto', 'Núcleo de Titânio', 'Rastro do Leviatã', 'Fúria de Andrômeda', 'Arco do Apocalipse', 'Prisma Soberano', 'Manto da Singularidade', 'Lâmina de Quasar', 'Aurora de Titã'],
  mitica: ['Essência do Vazio', 'Sopro da Fênix', 'Coração de Andrômeda', 'Luz do Primeiro Sol', 'Runa Celeste', 'Véu da Eternidade', 'Chama Ancestral', 'Oráculo de Cristal', 'Rastro do Dragão', 'Névoa dos Deuses', 'Pulso do Éter', 'Flor da Nebulosa', 'Portão do Infinito', 'Prisma de Avalon', 'Órbita Mística'],
  ultramítica: ['Além do Infinito', 'Singularidade Viva', 'Matriz dos Mundos', 'Ecos da Criação', 'Horizonte Impossível', 'Rastro do Multiverso', 'Núcleo da Eternidade', 'Trama da Existência', 'Vórtice dos Deuses', 'Pulso Omniversal', 'Luz do Último Portal', 'Coroa do Cosmos', 'Código Primordial', 'Fenda da Realidade', 'Essência Inominável'],
  celestial: ['Trono Celestial', 'Aurora do Firmamento', 'Asas do Zênite', 'Luz da Criação', 'Constelação Divina'],
};

const rarityStyle: Record<SkinRarity, { price: number; palette: [string, string]; tone: string; hue: number }> = {
  comum: { price: 140, palette: ['#9de5b7', '#497e77'], tone: 'green', hue: 84 },
  incomum: { price: 260, palette: ['#8de6d4', '#477cb3'], tone: 'cyan', hue: 145 },
  rara: { price: 520, palette: ['#92b8ff', '#6753b6'], tone: 'blue', hue: 205 },
  epica: { price: 950, palette: ['#dda0ff', '#803fc0'], tone: 'violet', hue: 265 },
  lendaria: { price: 1650, palette: ['#ffd77d', '#bd594c'], tone: 'amber', hue: 32 },
  ultralendaria: { price: 2700, palette: ['#ff9fc6', '#7955d8'], tone: 'pink', hue: 315 },
  mitica: { price: 3900, palette: ['#93f2e4', '#854fbd'], tone: 'mint', hue: 110 },
  ultramítica: { price: 5600, palette: ['#b7a9ff', '#3c8fd0'], tone: 'cosmic', hue: 190 },
  celestial: { price: 8400, palette: ['#fff0a8', '#7ee9e3'], tone: 'celestial', hue: 45 },
};

const generatedSkins = SKIN_RARITIES.flatMap(({ id: rarity, count }) => {
  const alreadyPresent = legacySkins.filter((skin) => skin.rarity === rarity).length;
  const needed = count - alreadyPresent;
  if (needed <= 0) return [];
  const style = rarityStyle[rarity];
  const names = generatedNames[rarity];
  if (names.length !== needed) {
    throw new Error(`Catálogo de skins inválido para ${rarity}: esperadas ${needed}, recebidas ${names.length}.`);
  }
  return names.map((name, index): SkinCatalogItem => ({
    id: `skin-${rarity}-${String(index + 1).padStart(2, '0')}`,
    name,
    kind: 'skin',
    rarity,
    description: `Efeito pixel art ${rarityStyle[rarity].tone} para personalizar cada corrida.`,
    price: style.price,
    colors: style.palette,
    tone: style.tone,
    look: 'trail',
    hue: (style.hue + index * 17) % 360,
  }));
});

export const SKINS: SkinCatalogItem[] = [...legacySkins, ...generatedSkins];

export function getSkinRarityCounts(): Record<SkinRarity, number> {
  return SKIN_RARITIES.reduce((counts, rarity) => {
    counts[rarity.id] = SKINS.filter((skin) => skin.rarity === rarity.id).length;
    return counts;
  }, {} as Record<SkinRarity, number>);
}
