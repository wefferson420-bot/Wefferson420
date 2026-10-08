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

export type SkinEffectCategory =
  | 'base'
  | 'detalhes'
  | 'brilho-sutil'
  | 'particulas-de-acao'
  | 'aura'
  | 'aura-intensa'
  | 'especial'
  | 'rastro'
  | 'unico';

export interface SkinAppearance {
  headwear: string;
  facewear: string;
  outfit: string;
  back: string;
  boots: string;
}

export interface RarityVisualConfig {
  detailLevel: number;
  auraStrength: number;
  particleCount: number;
  trail: boolean;
  jumpEffect: boolean;
  specialEffect: boolean;
  entryEffect: boolean;
}

export interface SkinRarityConfig {
  id: SkinRarity;
  label: string;
  count: number;
  order: number;
  priority: number;
  visualLevel: number;
  economicCategory: string;
  effectCategory: SkinEffectCategory;
  visual: RarityVisualConfig;
}

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
  appearance: SkinAppearance;
}

export const SKIN_RARITIES: SkinRarityConfig[] = [
  { id: 'comum', label: 'Comum', count: 15, order: 0, priority: 1, visualLevel: 1, economicCategory: 'inicial', effectCategory: 'base', visual: { detailLevel: 0, auraStrength: 0.06, particleCount: 0, trail: false, jumpEffect: false, specialEffect: false, entryEffect: false } },
  { id: 'incomum', label: 'Incomum', count: 15, order: 1, priority: 2, visualLevel: 2, economicCategory: 'popular', effectCategory: 'detalhes', visual: { detailLevel: 1, auraStrength: 0.09, particleCount: 0, trail: false, jumpEffect: false, specialEffect: false, entryEffect: false } },
  { id: 'rara', label: 'Rara', count: 15, order: 2, priority: 3, visualLevel: 3, economicCategory: 'rara', effectCategory: 'brilho-sutil', visual: { detailLevel: 2, auraStrength: 0.16, particleCount: 1, trail: false, jumpEffect: false, specialEffect: false, entryEffect: false } },
  { id: 'epica', label: 'Épica', count: 15, order: 3, priority: 4, visualLevel: 4, economicCategory: 'premium', effectCategory: 'particulas-de-acao', visual: { detailLevel: 3, auraStrength: 0.22, particleCount: 2, trail: false, jumpEffect: false, specialEffect: false, entryEffect: false } },
  { id: 'lendaria', label: 'Lendária', count: 15, order: 4, priority: 5, visualLevel: 5, economicCategory: 'lendaria', effectCategory: 'aura', visual: { detailLevel: 4, auraStrength: 0.3, particleCount: 3, trail: false, jumpEffect: false, specialEffect: false, entryEffect: false } },
  { id: 'ultralendaria', label: 'Ultralendária', count: 15, order: 5, priority: 6, visualLevel: 6, economicCategory: 'ultra', effectCategory: 'aura-intensa', visual: { detailLevel: 5, auraStrength: 0.38, particleCount: 4, trail: false, jumpEffect: true, specialEffect: false, entryEffect: false } },
  { id: 'mitica', label: 'Mítica', count: 15, order: 6, priority: 7, visualLevel: 7, economicCategory: 'mitica', effectCategory: 'especial', visual: { detailLevel: 6, auraStrength: 0.47, particleCount: 4, trail: false, jumpEffect: true, specialEffect: true, entryEffect: false } },
  { id: 'ultramítica', label: 'Ultramítica', count: 15, order: 7, priority: 8, visualLevel: 8, economicCategory: 'transcendente', effectCategory: 'rastro', visual: { detailLevel: 7, auraStrength: 0.56, particleCount: 5, trail: true, jumpEffect: true, specialEffect: true, entryEffect: false } },
  { id: 'celestial', label: 'Celestial', count: 5, order: 8, priority: 9, visualLevel: 9, economicCategory: 'celestial', effectCategory: 'unico', visual: { detailLevel: 8, auraStrength: 0.7, particleCount: 5, trail: true, jumpEffect: true, specialEffect: true, entryEffect: true } },
];

const headwearStyles = ['cap', 'hood', 'crown', 'visor', 'horn-helm', 'halo', 'feather', 'none'];
const facewearStyles = ['mask', 'glasses', 'war-paint', 'breather', 'none'];
const outfitStyles = ['sport', 'armor', 'tech', 'robe', 'adventure', 'jersey'];
const backStyles = ['cape', 'pack', 'wings', 'drone', 'scarf', 'none'];
const bootStyles = ['sneakers', 'greaves', 'high-boots', 'hover-boots'];

function generatedAppearance(index: number): SkinAppearance {
  return {
    headwear: headwearStyles[index % headwearStyles.length],
    facewear: facewearStyles[Math.floor(index / 2) % facewearStyles.length],
    outfit: outfitStyles[Math.floor(index / 3) % outfitStyles.length],
    back: backStyles[Math.floor(index / 4) % backStyles.length],
    boots: bootStyles[Math.floor(index / 5) % bootStyles.length],
  };
}

const legacySkins: SkinCatalogItem[] = [
  { id: 'aurora', name: 'Rastro Aurora', kind: 'skin', rarity: 'comum', description: 'Um rastro suave que acompanha cada salto.', price: 0, colors: ['#78f0cf', '#8068e9'], tone: 'green', look: 'trail', hue: 0, appearance: { headwear: 'none', facewear: 'none', outfit: 'sport', back: 'scarf', boots: 'sneakers' } },
  { id: 'pixel', name: 'Moldura Pixel', kind: 'skin', rarity: 'rara', description: 'Partículas quadradas inspiradas nos fliperamas.', price: 900, colors: ['#ffd34d', '#ff8a5b'], tone: 'amber', look: 'pixel', hue: 28, appearance: { headwear: 'visor', facewear: 'glasses', outfit: 'tech', back: 'drone', boots: 'hover-boots' } },
  { id: 'comet-trail', name: 'Rastro de Cometa', kind: 'skin', rarity: 'epica', description: 'Um risco de luz azul acompanha seus passos.', price: 1750, colors: ['#65dcff', '#3876e8'], tone: 'blue', look: 'comet', hue: 178, appearance: { headwear: 'halo', facewear: 'none', outfit: 'sport', back: 'cape', boots: 'high-boots' } },
  { id: 'aurora-pulse', name: 'Pulso Aurora', kind: 'skin', rarity: 'epica', description: 'Ondas verdes e violetas surgem durante a corrida.', price: 2300, colors: ['#78f0cf', '#8068e9'], tone: 'green', look: 'pulse', hue: 90, appearance: { headwear: 'feather', facewear: 'war-paint', outfit: 'robe', back: 'wings', boots: 'greaves' } },
  { id: 'supernova', name: 'Supernova', kind: 'skin', rarity: 'lendaria', description: 'Partículas douradas para marcar corridas especiais.', price: 4800, colors: ['#ffd34d', '#ff8a5b'], tone: 'amber', look: 'nova', hue: 42, appearance: { headwear: 'crown', facewear: 'none', outfit: 'armor', back: 'wings', boots: 'greaves' } },
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

const generatedSkins = SKIN_RARITIES.flatMap(({ id: rarity, count, order }) => {
  const alreadyPresent = legacySkins.filter((skin) => skin.rarity === rarity).length;
  const needed = count - alreadyPresent;
  if (needed <= 0) return [];
  const style = rarityStyle[rarity];
  const names = generatedNames[rarity];
  if (names.length !== needed) {
    throw new Error(`Catálogo de skins inválido para ${rarity}: esperadas ${needed}, recebidas ${names.length}.`);
  }
  return names.map((name, index): SkinCatalogItem => {
    const appearance = rarity === 'celestial'
      ? [
          { headwear: 'halo', facewear: 'visor', outfit: 'armor', back: 'wings', boots: 'hover-boots' },
          { headwear: 'crown', facewear: 'war-paint', outfit: 'robe', back: 'cape', boots: 'greaves' },
          { headwear: 'feather', facewear: 'none', outfit: 'tech', back: 'drone', boots: 'high-boots' },
          { headwear: 'horn-helm', facewear: 'mask', outfit: 'adventure', back: 'wings', boots: 'greaves' },
          { headwear: 'halo', facewear: 'glasses', outfit: 'jersey', back: 'scarf', boots: 'sneakers' },
        ][index] as SkinAppearance
      : generatedAppearance(order * 15 + index);
    const visualNames: Record<string, string> = {
      cap: 'boné esportivo', hood: 'capuz', crown: 'coroa', visor: 'viseira', 'horn-helm': 'elmo com chifres', halo: 'auréola', feather: 'penacho',
      mask: 'máscara', glasses: 'óculos', 'war-paint': 'pintura de batalha', breather: 'respirador',
      sport: 'uniforme esportivo', armor: 'armadura', tech: 'traje tecnológico', robe: 'manto mágico', adventure: 'equipamento de aventura', jersey: 'uniforme de equipe',
      cape: 'capa', pack: 'mochila', wings: 'asas', drone: 'drone auxiliar', scarf: 'cachecol', sneakers: 'tênis', greaves: 'grevas', 'high-boots': 'botas altas', 'hover-boots': 'botas propulsoras',
    };
    const details = [appearance.headwear, appearance.facewear, appearance.outfit, appearance.back, appearance.boots]
      .filter((part) => part !== 'none')
      .map((part) => visualNames[part]);
    return {
      id: `skin-${rarity}-${String(index + 1).padStart(2, '0')}`,
      name,
      kind: 'skin',
      rarity,
      description: `Visual ${details.slice(0, 3).join(', ')}${details.length > 3 ? ` e ${details[3]}` : ''}.`,
      price: style.price,
      colors: style.palette,
      tone: style.tone,
      look: appearance.outfit,
      hue: (style.hue + index * 17) % 360,
      appearance,
    };
  });
});

export const SKINS: SkinCatalogItem[] = [...legacySkins, ...generatedSkins];
export const SKINS_BY_ID = new Map(SKINS.map((skin) => [skin.id, skin]));

export function getSkinRarityCounts(): Record<SkinRarity, number> {
  return SKIN_RARITIES.reduce((counts, rarity) => {
    counts[rarity.id] = SKINS.filter((skin) => skin.rarity === rarity.id).length;
    return counts;
  }, {} as Record<SkinRarity, number>);
}
