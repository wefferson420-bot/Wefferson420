import { useSyncExternalStore } from 'react';
import { updateRaceAdaptation } from './race-generation';
import { SKINS, type SkinAppearance, type SkinRarity } from './skin-catalog';

export type PlayableGameId = 'reflexo' | 'memoria' | 'corrida';
export type GameId = PlayableGameId | 'toque-rapido';
export type CosmeticKind = 'personagem' | 'skin';
export type CosmeticRarity = SkinRarity;
export type RankTierId = 'bronze' | 'prata' | 'ouro' | 'diamante' | 'esmeralda' | 'safira';

export interface Cosmetic {
  id: string;
  name: string;
  kind: CosmeticKind;
  rarity: CosmeticRarity;
  description: string;
  price: number;
  colors: [string, string];
  tone: string;
  look: string;
  hue?: number;
  unlockTier?: RankTierId;
  appearance?: SkinAppearance;
}

export interface GameResult {
  id: string;
  gameId: GameId;
  score: number;
  coinsEarned: number;
  playedAt: string;
}

export interface RaceBestRun {
  distance: number;
  score: number;
  obstaclesCleared: number;
  survivalMs: number;
  enemiesDefeated?: number;
  bonusesCollected?: number;
  playedAt: string;
}

export interface SeasonState {
  id: string;
  startsAt: string;
  endsAt: string;
  points: number;
}

export interface SeasonRecord {
  id: string;
  tierId: RankTierId;
  tierLabel: string;
  points: number;
  coinsAwarded: number;
  xpAwarded: number;
  cosmeticAwarded?: string;
  endedAt: string;
}

export interface RankTier {
  id: RankTierId;
  label: string;
  minPoints: number;
  coinsReward: number;
  xpReward: number;
  color: string;
  nextUnlock?: string;
}

export interface ArcadeState {
  coins: number;
  totalXp: number;
  totalGames: number;
  totalScore: number;
  bestScores: Partial<Record<GameId, number>>;
  ownedCharacterIds: string[];
  ownedSkinIds: string[];
  selectedCharacterId: string;
  selectedSkinId: string;
  lastDailyDate: string | null;
  dailyStreak: number;
  recentResults: GameResult[];
  memoryLevel: number;
  memoryWins: number;
  reflexHits: number;
  reflexFalseHits: number;
  reflexMisses: number;
  reflexMaxCombo: number;
  reflexTotalReactionMs: number;
  reflexReactionCount: number;
  bestReactionMs: number | null;
  raceBestDistance: number;
  raceTotalDistance: number;
  raceBestScore: number;
  raceBestObstacles: number;
  raceBestSurvivalMs: number;
  raceBestRun: RaceBestRun | null;
  raceObstaclesCleared: number;
  raceEnemiesDefeated: number;
  raceBonusesCollected: number;
  raceRecentPatternIds: string[];
  raceRecentSequenceKeys: string[];
  raceAdaptation: number;
  season: SeasonState;
  seasonHistory: SeasonRecord[];
  claimedMissionIds: string[];
}

export interface GamePerformance {
  distance?: number;
  raceScore?: number;
  obstaclesCleared?: number;
  survivalMs?: number;
  enemiesDefeated?: number;
  bonusesCollected?: number;
  racePatternIds?: string[];
  raceSequenceKeys?: string[];
  memoryLevel?: number;
  memoryCleared?: boolean;
  memoryElapsedSeconds?: number;
  memoryMoves?: number;
  memoryErrors?: number;
  memoryMaxCombo?: number;
  memoryQuickMode?: boolean;
  reflexReactionsMs?: number[];
  reflexFalseHits?: number;
  reflexMisses?: number;
  reflexMaxCombo?: number;
  xpBonus?: number;
  coinBonus?: number;
}

export interface GameCompletion {
  score: number;
  coinsEarned: number;
  dailyBonus: number;
  xpEarned: number;
  rankPointsEarned: number;
  leveledUp: boolean;
  rankedUp: boolean;
}

export interface MissionView {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  coinsReward: number;
  xpReward: number;
  claimed: boolean;
  claimable: boolean;
}

export type StoreResult =
  | { ok: true; coinsRemaining: number }
  | { ok: false; reason: 'not-found' | 'already-owned' | 'not-enough-coins' | 'rank-required' };

const STORAGE_KEY = 'desafio-infinito.progress.v1';
const SEASON_LENGTH_MS = 30 * 24 * 60 * 60 * 1000;
const PLAYABLE_GAMES: PlayableGameId[] = ['reflexo', 'memoria', 'corrida'];

export const RANK_TIERS: RankTier[] = [
  { id: 'bronze', label: 'Bronze', minPoints: 0, coinsReward: 20, xpReward: 30, color: '#bc855f' },
  { id: 'prata', label: 'Prata', minPoints: 200, coinsReward: 45, xpReward: 60, color: '#c8d0dc' },
  { id: 'ouro', label: 'Ouro', minPoints: 600, coinsReward: 80, xpReward: 110, color: '#f0c76b' },
  { id: 'diamante', label: 'Diamante', minPoints: 1300, coinsReward: 130, xpReward: 180, color: '#83d7f2' },
  { id: 'esmeralda', label: 'Esmeralda', minPoints: 2400, coinsReward: 200, xpReward: 280, color: '#74dfad', nextUnlock: 'Cyber Runner' },
  { id: 'safira', label: 'Safira', minPoints: 4200, coinsReward: 300, xpReward: 420, color: '#9e8cff', nextUnlock: 'Corredor Lendário' },
];

export const COSMETICS: Cosmetic[] = [
  { id: 'robot', name: 'Robô de Bolso', kind: 'personagem', rarity: 'comum', description: 'Seu primeiro corredor: leve, curioso e pronto para a pista.', price: 0, colors: ['#cbb2ff', '#7654bd'], tone: 'violet', look: 'robot' },
  { id: 'ninja', name: 'Ninja da Meia-Noite', kind: 'personagem', rarity: 'rara', description: 'Capuz escuro, faixa vermelha e lâmina de treino.', price: 420, colors: ['#ff6b83', '#292138'], tone: 'pink', look: 'ninja' },
  { id: 'explorer', name: 'Exploradora', kind: 'personagem', rarity: 'rara', description: 'Mochila de trilha, botas firmes e chapéu de aventura.', price: 680, colors: ['#f1c879', '#704a38'], tone: 'amber', look: 'explorer' },
  { id: 'warrior', name: 'Guerreiro do Eclipse', kind: 'personagem', rarity: 'epica', description: 'Armadura em camadas e ombreiras de batalha.', price: 1450, colors: ['#91a7ff', '#35416f'], tone: 'blue', look: 'warrior' },
  { id: 'astronaut', name: 'Astronauta Orbital', kind: 'personagem', rarity: 'epica', description: 'Traje pressurizado, visor de vidro e mochila de oxigênio.', price: 2100, colors: ['#b4ecff', '#6778bb'], tone: 'blue', look: 'astronaut' },
  { id: 'samurai', name: 'Samurai Carmesim', kind: 'personagem', rarity: 'lendaria', description: 'Kabuto, máscara e katana para uma entrada lendária.', price: 3900, colors: ['#ff776b', '#563045'], tone: 'pink', look: 'samurai' },
  { id: 'cyber-runner', name: 'Cyber Runner', kind: 'personagem', rarity: 'lendaria', description: 'Placas cromadas e visor elétrico. Prêmio de uma temporada Esmeralda.', price: 0, colors: ['#5bf1d2', '#4657cb'], tone: 'green', look: 'cyber', unlockTier: 'esmeralda' },
  { id: 'legendary-runner', name: 'Corredor Lendário', kind: 'personagem', rarity: 'lendaria', description: 'Armadura dourada e capa estelar. Prêmio de uma temporada Safira.', price: 0, colors: ['#ffe599', '#bc6cff'], tone: 'amber', look: 'legendary', unlockTier: 'safira' },
  { id: 'nina-neon', name: 'Nina Neon', kind: 'personagem', rarity: 'rara', description: 'Uma corredora de cabelo neon e jaqueta brilhante.', price: 900, colors: ['#ff8abe', '#a4459b'], tone: 'pink', look: 'nina-neon' },
  { id: 'cosmo', name: 'Cosmo', kind: 'personagem', rarity: 'epica', description: 'Um pequeno explorador espacial de outro sistema.', price: 1550, colors: ['#73d5ff', '#5463d6'], tone: 'blue', look: 'cosmo' },
  ...SKINS,
];

function createSeason(start = new Date()): SeasonState {
  const startsAt = start.toISOString();
  return {
    id: `temporada-${start.getTime()}`,
    startsAt,
    endsAt: new Date(start.getTime() + SEASON_LENGTH_MS).toISOString(),
    points: 0,
  };
}

const initialState: ArcadeState = {
  coins: 120,
  totalXp: 0,
  totalGames: 0,
  totalScore: 0,
  bestScores: {},
  ownedCharacterIds: ['robot'],
  ownedSkinIds: ['aurora'],
  selectedCharacterId: 'robot',
  selectedSkinId: 'aurora',
  lastDailyDate: null,
  dailyStreak: 0,
  recentResults: [],
  memoryLevel: 1,
  memoryWins: 0,
  reflexHits: 0,
  reflexFalseHits: 0,
  reflexMisses: 0,
  reflexMaxCombo: 0,
  reflexTotalReactionMs: 0,
  reflexReactionCount: 0,
  bestReactionMs: null,
  raceBestDistance: 0,
  raceTotalDistance: 0,
  raceBestScore: 0,
  raceBestObstacles: 0,
  raceBestSurvivalMs: 0,
  raceBestRun: null,
  raceObstaclesCleared: 0,
  raceEnemiesDefeated: 0,
  raceBonusesCollected: 0,
  raceRecentPatternIds: [],
  raceRecentSequenceKeys: [],
  raceAdaptation: 0.42,
  season: createSeason(),
  seasonHistory: [],
  claimedMissionIds: [],
};

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isYesterday(previousDate: string, today: string): boolean {
  const previous = new Date(`${previousDate}T12:00:00`);
  previous.setDate(previous.getDate() + 1);
  return localDateKey(previous) === today;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function finiteNonNegative(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

function isValidState(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  return (
    finiteNonNegative(value.coins, -1) >= 0 &&
    finiteNonNegative(value.totalXp, -1) >= 0 &&
    finiteNonNegative(value.totalGames, -1) >= 0 &&
    finiteNonNegative(value.totalScore, -1) >= 0 &&
    Array.isArray(value.ownedCharacterIds) &&
    Array.isArray(value.ownedSkinIds) &&
    Array.isArray(value.recentResults) &&
    typeof value.selectedCharacterId === 'string' &&
    typeof value.selectedSkinId === 'string'
  );
}

function validSeason(value: unknown): value is SeasonState {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.startsAt === 'string' &&
    Number.isFinite(Date.parse(value.startsAt)) &&
    typeof value.endsAt === 'string' &&
    Number.isFinite(Date.parse(value.endsAt)) &&
    finiteNonNegative(value.points, -1) >= 0
  );
}

function migrateState(raw: Record<string, unknown>): ArcadeState {
  const savedBestScores = isRecord(raw.bestScores) ? raw.bestScores : {};
  const bestScores = Object.fromEntries(
    Object.entries(savedBestScores)
      .filter(([gameId, score]) => (
        ['reflexo', 'memoria', 'corrida', 'toque-rapido'].includes(gameId) &&
        typeof score === 'number' &&
        Number.isFinite(score) &&
        score >= 0
      )),
  ) as Partial<Record<GameId, number>>;
  const savedCharacters = Array.isArray(raw.ownedCharacterIds)
    ? raw.ownedCharacterIds.filter((id): id is string => typeof id === 'string')
    : [];
  const savedSkins = Array.isArray(raw.ownedSkinIds)
    ? raw.ownedSkinIds.filter((id): id is string => typeof id === 'string')
    : [];
  const savedSeason = validSeason(raw.season) ? raw.season : createSeason();
  const selectedCharacterId = typeof raw.selectedCharacterId === 'string'
    ? raw.selectedCharacterId
    : 'robot';
  const selectedSkinId = typeof raw.selectedSkinId === 'string'
    ? raw.selectedSkinId
    : 'aurora';
  const savedRaceBestRun = isRecord(raw.raceBestRun) &&
    finiteNonNegative(raw.raceBestRun.distance, -1) >= 0 &&
    finiteNonNegative(raw.raceBestRun.score, -1) >= 0 &&
    finiteNonNegative(raw.raceBestRun.obstaclesCleared, -1) >= 0 &&
    finiteNonNegative(raw.raceBestRun.survivalMs, -1) >= 0 &&
    typeof raw.raceBestRun.playedAt === 'string'
    ? {
        distance: finiteNonNegative(raw.raceBestRun.distance),
        score: finiteNonNegative(raw.raceBestRun.score),
        obstaclesCleared: finiteNonNegative(raw.raceBestRun.obstaclesCleared),
        survivalMs: finiteNonNegative(raw.raceBestRun.survivalMs),
        enemiesDefeated: finiteNonNegative(raw.raceBestRun.enemiesDefeated),
        bonusesCollected: finiteNonNegative(raw.raceBestRun.bonusesCollected),
        playedAt: raw.raceBestRun.playedAt,
      }
    : null;

  return {
    ...initialState,
    coins: finiteNonNegative(raw.coins, initialState.coins),
    totalXp: finiteNonNegative(raw.totalXp),
    totalGames: finiteNonNegative(raw.totalGames),
    totalScore: finiteNonNegative(raw.totalScore),
    bestScores,
    ownedCharacterIds: [...new Set([...savedCharacters, 'robot'])],
    ownedSkinIds: [...new Set([...savedSkins, 'aurora'])],
    selectedCharacterId: COSMETICS.some((item) => item.id === selectedCharacterId && item.kind === 'personagem')
      ? selectedCharacterId
      : 'robot',
    selectedSkinId: COSMETICS.some((item) => item.id === selectedSkinId && item.kind === 'skin')
      ? selectedSkinId
      : 'aurora',
    lastDailyDate: typeof raw.lastDailyDate === 'string' ? raw.lastDailyDate : null,
    dailyStreak: finiteNonNegative(raw.dailyStreak),
    recentResults: Array.isArray(raw.recentResults)
      ? raw.recentResults.filter((entry): entry is GameResult => {
          if (!isRecord(entry)) return false;
          return (
            typeof entry.id === 'string' &&
            ['reflexo', 'memoria', 'corrida', 'toque-rapido'].includes(String(entry.gameId)) &&
            finiteNonNegative(entry.score, -1) >= 0 &&
            finiteNonNegative(entry.coinsEarned, -1) >= 0 &&
            typeof entry.playedAt === 'string'
          );
        }).slice(0, 12)
      : [],
    memoryLevel: Math.max(1, Math.floor(finiteNonNegative(raw.memoryLevel, 1))),
    memoryWins: finiteNonNegative(raw.memoryWins),
    reflexHits: finiteNonNegative(raw.reflexHits),
    reflexFalseHits: finiteNonNegative(raw.reflexFalseHits),
    reflexMisses: finiteNonNegative(raw.reflexMisses),
    reflexMaxCombo: finiteNonNegative(raw.reflexMaxCombo),
    reflexTotalReactionMs: finiteNonNegative(raw.reflexTotalReactionMs),
    reflexReactionCount: finiteNonNegative(raw.reflexReactionCount),
    bestReactionMs: finiteNonNegative(raw.bestReactionMs, -1) >= 0
      ? finiteNonNegative(raw.bestReactionMs)
      : null,
    raceBestDistance: finiteNonNegative(raw.raceBestDistance),
    raceTotalDistance: finiteNonNegative(raw.raceTotalDistance),
    raceBestScore: finiteNonNegative(raw.raceBestScore, finiteNonNegative(bestScores.corrida)),
    raceBestObstacles: finiteNonNegative(raw.raceBestObstacles),
    raceBestSurvivalMs: finiteNonNegative(raw.raceBestSurvivalMs),
    raceBestRun: savedRaceBestRun,
    raceObstaclesCleared: finiteNonNegative(raw.raceObstaclesCleared),
    raceEnemiesDefeated: finiteNonNegative(raw.raceEnemiesDefeated),
    raceBonusesCollected: finiteNonNegative(raw.raceBonusesCollected),
    raceRecentPatternIds: Array.isArray(raw.raceRecentPatternIds)
      ? raw.raceRecentPatternIds.filter((id): id is string => typeof id === 'string').slice(-8)
      : [],
    raceRecentSequenceKeys: Array.isArray(raw.raceRecentSequenceKeys)
      ? raw.raceRecentSequenceKeys.filter((key): key is string => typeof key === 'string').slice(-8)
      : [],
    raceAdaptation: Math.min(1, finiteNonNegative(raw.raceAdaptation, 0.42)),
    season: savedSeason,
    seasonHistory: Array.isArray(raw.seasonHistory)
      ? raw.seasonHistory.filter((entry): entry is SeasonRecord => {
          if (!isRecord(entry)) return false;
          return (
            typeof entry.id === 'string' &&
            RANK_TIERS.some((tier) => tier.id === entry.tierId) &&
            typeof entry.tierLabel === 'string' &&
            finiteNonNegative(entry.points, -1) >= 0 &&
            finiteNonNegative(entry.coinsAwarded, -1) >= 0 &&
            finiteNonNegative(entry.xpAwarded, -1) >= 0 &&
            typeof entry.endedAt === 'string'
          );
        }).slice(0, 12)
      : [],
    claimedMissionIds: Array.isArray(raw.claimedMissionIds)
      ? raw.claimedMissionIds.filter((id): id is string => typeof id === 'string')
      : [],
  };
}

function loadState(): ArcadeState {
  if (typeof window === 'undefined') return initialState;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialState;
    const parsed: unknown = JSON.parse(stored);
    if (!isValidState(parsed)) {
      console.error('O progresso local do CHALLENGE X está inválido.');
      return initialState;
    }
    return migrateState(parsed);
  } catch (error) {
    console.error('Não foi possível carregar o progresso salvo.', error);
    return initialState;
  }
}

let state = loadState();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Não foi possível salvar o progresso neste dispositivo.', error);
  }
}

function publish() {
  persist();
  listeners.forEach((listener) => listener());
}

export function getArcadeState(): ArcadeState {
  return state;
}

export function subscribeToArcadeState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useArcadeState(): ArcadeState {
  return useSyncExternalStore(
    subscribeToArcadeState,
    getArcadeState,
    () => initialState,
  );
}

export function getLevel(totalXp: number): number {
  return Math.floor(totalXp / 100) + 1;
}

export function getLevelProgress(totalXp: number): number {
  return totalXp % 100;
}

export function getMemoryPairCount(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel < 6) return 2;
  if (safeLevel < 8) return 3;
  if (safeLevel < 12) return 4;
  if (safeLevel < 16) return 6;
  if (safeLevel < 20) return 8;
  if (safeLevel < 24) return 10;
  if (safeLevel < 30) return 12;
  return 15 + Math.floor((safeLevel - 30) / 2);
}

export function getMemoryTimeLimit(level: number, quickMode = false): number | null {
  if (level < 4 && !quickMode) return null;
  const pairCount = getMemoryPairCount(level);
  const regularLimit = level < 4 ? Math.max(60, 42 + pairCount * 8) : 42 + pairCount * 8;
  return quickMode ? Math.max(25, Math.round(regularLimit * 0.72)) : regularLimit;
}

export function getRankTier(points: number): RankTier {
  return [...RANK_TIERS].reverse().find((tier) => points >= tier.minPoints) ?? RANK_TIERS[0];
}

export function getNextRankTier(points: number): RankTier | undefined {
  const currentIndex = RANK_TIERS.findIndex((tier) => tier.id === getRankTier(points).id);
  return RANK_TIERS[currentIndex + 1];
}

export function getRankProgress(points: number): number {
  const current = getRankTier(points);
  const next = getNextRankTier(points);
  if (!next) return 100;
  return Math.min(100, Math.max(0, Math.round(((points - current.minPoints) / (next.minPoints - current.minPoints)) * 100)));
}

export function getSeasonDaysRemaining(season: SeasonState, now = new Date()): number {
  return Math.max(0, Math.ceil((Date.parse(season.endsAt) - now.getTime()) / (24 * 60 * 60 * 1000)));
}

export function getCurrentDailyStreak(arcadeState = state, now = new Date()): number {
  if (!arcadeState.lastDailyDate) return 0;
  const today = localDateKey(now);
  if (arcadeState.lastDailyDate === today) return arcadeState.dailyStreak;
  return isYesterday(arcadeState.lastDailyDate, today) ? arcadeState.dailyStreak : 0;
}

function settleExpiredSeasons(now: Date): boolean {
  let changed = false;
  while (now.getTime() >= Date.parse(state.season.endsAt)) {
    changed = true;
    const endedSeason = state.season;
    const tier = getRankTier(endedSeason.points);
    const hasPlayed = endedSeason.points > 0;
    const coinsAwarded = hasPlayed ? tier.coinsReward : 0;
    const xpAwarded = hasPlayed ? tier.xpReward : 0;
    const cosmetic = hasPlayed && tier.id === 'esmeralda'
      ? 'cyber-runner'
      : hasPlayed && tier.id === 'safira'
        ? 'legendary-runner'
        : undefined;
    const ownedCharacterIds = cosmetic && !state.ownedCharacterIds.includes(cosmetic)
      ? [...state.ownedCharacterIds, cosmetic]
      : state.ownedCharacterIds;
    state = {
      ...state,
      coins: state.coins + coinsAwarded,
      totalXp: state.totalXp + xpAwarded,
      ownedCharacterIds,
      seasonHistory: [{
        id: endedSeason.id,
        tierId: tier.id,
        tierLabel: tier.label,
        points: endedSeason.points,
        coinsAwarded,
        xpAwarded,
        cosmeticAwarded: cosmetic && !state.ownedCharacterIds.includes(cosmetic) ? cosmetic : undefined,
        endedAt: endedSeason.endsAt,
      }, ...state.seasonHistory].slice(0, 12),
      season: createSeason(new Date(Date.parse(endedSeason.endsAt))),
    };
  }
  return changed;
}

export function refreshSeason(now = new Date()): boolean {
  const changed = settleExpiredSeasons(now);
  if (changed) publish();
  return changed;
}

const MISSION_DEFINITIONS: Array<Pick<MissionView, 'id' | 'title' | 'description' | 'target' | 'coinsReward' | 'xpReward'> & {
  measure: (arcadeState: ArcadeState) => number;
}> = [
  { id: 'three-games', title: 'Aquecimento', description: 'Finalize três partidas em qualquer minijogo.', target: 3, coinsReward: 18, xpReward: 28, measure: (s) => s.totalGames },
  { id: 'reflex-ten', title: 'Mira afiada', description: 'Acerte dez sinais verdadeiros no Reflexo.', target: 10, coinsReward: 22, xpReward: 32, measure: (s) => s.reflexHits },
  { id: 'race-three-hundred', title: 'Pé na pista', description: 'Alcance 300 metros em uma única Corrida Infinita.', target: 300, coinsReward: 30, xpReward: 42, measure: (s) => s.raceBestDistance },
  { id: 'memory-three', title: 'Memória de campeão', description: 'Complete três níveis do jogo da memória.', target: 3, coinsReward: 32, xpReward: 45, measure: (s) => s.memoryWins },
  { id: 'score-seven-fifty', title: 'Recorde pessoal', description: 'Faça 750 pontos ou metros em uma única partida.', target: 750, coinsReward: 35, xpReward: 48, measure: (s) => Math.max(0, ...Object.values(s.bestScores).filter((n): n is number => typeof n === 'number')) },
  { id: 'streak-three', title: 'Voltou para jogar', description: 'Jogue em três dias seguidos.', target: 3, coinsReward: 28, xpReward: 40, measure: (s) => getCurrentDailyStreak(s) },
  { id: 'rank-gold', title: 'Suba no ranking', description: 'Alcance a categoria Ouro nesta temporada.', target: 600, coinsReward: 40, xpReward: 55, measure: (s) => s.season.points },
];

export function getMissions(arcadeState = state): MissionView[] {
  return MISSION_DEFINITIONS.map((mission) => {
    const progress = Math.min(mission.target, mission.measure(arcadeState));
    const claimed = arcadeState.claimedMissionIds.includes(mission.id);
    return {
      id: mission.id,
      title: mission.title,
      description: mission.description,
      target: mission.target,
      progress,
      coinsReward: mission.coinsReward,
      xpReward: mission.xpReward,
      claimed,
      claimable: progress >= mission.target && !claimed,
    };
  });
}

export function claimMission(missionId: string): boolean {
  refreshSeason();
  const mission = getMissions().find((item) => item.id === missionId);
  if (!mission?.claimable) return false;
  state = {
    ...state,
    coins: state.coins + mission.coinsReward,
    totalXp: state.totalXp + mission.xpReward,
    claimedMissionIds: [...state.claimedMissionIds, missionId],
  };
  publish();
  return true;
}

export function completeGame(
  gameId: PlayableGameId,
  rawScore: number,
  performance: GamePerformance = {},
): GameCompletion {
  refreshSeason();
  if (!PLAYABLE_GAMES.includes(gameId)) {
    throw new Error(`Jogo desconhecido: ${gameId}`);
  }
  if (!Number.isFinite(rawScore) || rawScore < 0) {
    throw new Error('A pontuação precisa ser um número positivo.');
  }

  const score = Math.min(1_000_000, Math.floor(rawScore));
  const beforeLevel = getLevel(state.totalXp);
  const beforeTierId = getRankTier(state.season.points).id;
  const today = localDateKey();
  const firstGameToday = state.lastDailyDate !== today;
  const dailyBonus = firstGameToday ? 20 : 0;
  const newStreak = firstGameToday
    ? state.lastDailyDate && isYesterday(state.lastDailyDate, today)
      ? state.dailyStreak + 1
      : 1
    : state.dailyStreak;
  const memoryLevel = Math.max(1, Math.floor(finiteNonNegative(performance.memoryLevel, state.memoryLevel)));
  const memoryCleared = gameId === 'memoria' && performance.memoryCleared === true;
  const distance = gameId === 'corrida' ? Math.floor(finiteNonNegative(performance.distance, score)) : 0;
  const raceScore = gameId === 'corrida'
    ? Math.floor(finiteNonNegative(performance.raceScore, distance))
    : 0;
  const obstaclesCleared = gameId === 'corrida'
    ? Math.floor(finiteNonNegative(performance.obstaclesCleared))
    : 0;
  const survivalMs = gameId === 'corrida'
    ? Math.floor(finiteNonNegative(performance.survivalMs))
    : 0;
  const enemiesDefeated = gameId === 'corrida'
    ? Math.floor(finiteNonNegative(performance.enemiesDefeated))
    : 0;
  const bonusesCollected = gameId === 'corrida'
    ? Math.floor(finiteNonNegative(performance.bonusesCollected))
    : 0;
  const reactions = gameId === 'reflexo' && Array.isArray(performance.reflexReactionsMs)
    ? performance.reflexReactionsMs.filter((ms) => Number.isFinite(ms) && ms >= 0 && ms <= 10_000)
    : [];
  const reflexFalseHits = gameId === 'reflexo' ? Math.floor(finiteNonNegative(performance.reflexFalseHits)) : 0;
  const reflexMisses = gameId === 'reflexo' ? Math.floor(finiteNonNegative(performance.reflexMisses)) : 0;
  const difficultyCoinBonus = memoryCleared ? Math.min(30, Math.max(0, memoryLevel - 1) * 2) : 0;
  const difficultyXpBonus = memoryCleared ? Math.min(60, Math.max(0, memoryLevel - 1) * 4) : 0;
  const extraCoins = Math.min(100, Math.floor(finiteNonNegative(performance.coinBonus)));
  const extraXp = Math.min(120, Math.floor(finiteNonNegative(performance.xpBonus)));
  const coinsEarned = 8 + Math.min(20, Math.floor(score / 80)) + difficultyCoinBonus + extraCoins + dailyBonus;
  const xpEarned = 18 + Math.min(45, Math.floor(score / 25)) + difficultyXpBonus + extraXp;
  const rankPointsEarned = Math.max(8, Math.min(250, Math.floor(score / 5)));
  const nextSeasonPoints = state.season.points + rankPointsEarned;
  const result: GameResult = {
    id: `${Date.now()}-${state.totalGames + 1}`,
    gameId,
    score,
    coinsEarned,
    playedAt: new Date().toISOString(),
  };
  const raceBestRun = gameId === 'corrida' && raceScore > state.raceBestScore
    ? {
        distance,
        score: raceScore,
        obstaclesCleared,
        survivalMs,
        enemiesDefeated,
        bonusesCollected,
        playedAt: result.playedAt,
      }
    : state.raceBestRun;
  const racePatternIds = gameId === 'corrida' && Array.isArray(performance.racePatternIds)
    ? performance.racePatternIds.filter((id): id is string => typeof id === 'string').slice(-8)
    : [];
  const raceSequenceKeys = gameId === 'corrida' && Array.isArray(performance.raceSequenceKeys)
    ? performance.raceSequenceKeys.filter((key): key is string => typeof key === 'string').slice(-8)
    : [];

  state = {
    ...state,
    coins: state.coins + coinsEarned,
    totalXp: state.totalXp + xpEarned,
    totalGames: state.totalGames + 1,
    totalScore: state.totalScore + score,
    bestScores: {
      ...state.bestScores,
      [gameId]: Math.max(state.bestScores[gameId] ?? 0, score),
    },
    lastDailyDate: firstGameToday ? today : state.lastDailyDate,
    dailyStreak: newStreak,
    recentResults: [result, ...state.recentResults].slice(0, 12),
    memoryLevel: memoryCleared ? Math.max(state.memoryLevel, memoryLevel + 1) : state.memoryLevel,
    memoryWins: state.memoryWins + (memoryCleared ? 1 : 0),
    reflexHits: state.reflexHits + reactions.length,
    reflexFalseHits: state.reflexFalseHits + reflexFalseHits,
    reflexMisses: state.reflexMisses + reflexMisses,
    reflexMaxCombo: gameId === 'reflexo'
      ? Math.max(state.reflexMaxCombo, Math.floor(finiteNonNegative(performance.reflexMaxCombo)))
      : state.reflexMaxCombo,
    reflexTotalReactionMs: state.reflexTotalReactionMs + reactions.reduce((sum, ms) => sum + ms, 0),
    reflexReactionCount: state.reflexReactionCount + reactions.length,
    bestReactionMs: reactions.length
      ? Math.min(state.bestReactionMs ?? Infinity, ...reactions)
      : state.bestReactionMs,
    raceBestDistance: gameId === 'corrida' ? Math.max(state.raceBestDistance, distance) : state.raceBestDistance,
    raceTotalDistance: state.raceTotalDistance + distance,
    raceBestScore: gameId === 'corrida' ? Math.max(state.raceBestScore, raceScore) : state.raceBestScore,
    raceBestObstacles: gameId === 'corrida' ? Math.max(state.raceBestObstacles, obstaclesCleared) : state.raceBestObstacles,
    raceBestSurvivalMs: gameId === 'corrida' ? Math.max(state.raceBestSurvivalMs, survivalMs) : state.raceBestSurvivalMs,
    raceBestRun,
    raceObstaclesCleared: state.raceObstaclesCleared + obstaclesCleared,
    raceEnemiesDefeated: state.raceEnemiesDefeated + enemiesDefeated,
    raceBonusesCollected: state.raceBonusesCollected + bonusesCollected,
    raceRecentPatternIds: gameId === 'corrida'
      ? [...state.raceRecentPatternIds, ...racePatternIds].slice(-8)
      : state.raceRecentPatternIds,
    raceRecentSequenceKeys: gameId === 'corrida'
      ? [...state.raceRecentSequenceKeys, ...raceSequenceKeys].slice(-8)
      : state.raceRecentSequenceKeys,
    raceAdaptation: gameId === 'corrida'
      ? updateRaceAdaptation(state.raceAdaptation, distance, obstaclesCleared)
      : state.raceAdaptation,
    season: { ...state.season, points: nextSeasonPoints },
  };
  publish();

  return {
    score,
    coinsEarned,
    dailyBonus,
    xpEarned,
    rankPointsEarned,
    leveledUp: getLevel(state.totalXp) > beforeLevel,
    rankedUp: getRankTier(state.season.points).id !== beforeTierId,
  };
}

export function purchaseCosmetic(cosmeticId: string): StoreResult {
  refreshSeason();
  const cosmetic = COSMETICS.find((item) => item.id === cosmeticId);
  if (!cosmetic) return { ok: false, reason: 'not-found' };

  const ownedIds =
    cosmetic.kind === 'personagem'
      ? state.ownedCharacterIds
      : state.ownedSkinIds;
  if (ownedIds.includes(cosmetic.id)) {
    return { ok: false, reason: 'already-owned' };
  }
  if (cosmetic.unlockTier) {
    const currentIndex = RANK_TIERS.findIndex((tier) => tier.id === getRankTier(state.season.points).id);
    const requiredIndex = RANK_TIERS.findIndex((tier) => tier.id === cosmetic.unlockTier);
    if (currentIndex < requiredIndex) return { ok: false, reason: 'rank-required' };
  }
  if (state.coins < cosmetic.price) {
    return { ok: false, reason: 'not-enough-coins' };
  }

  state = {
    ...state,
    coins: state.coins - cosmetic.price,
    ...(cosmetic.kind === 'personagem'
      ? { ownedCharacterIds: [...state.ownedCharacterIds, cosmetic.id] }
      : { ownedSkinIds: [...state.ownedSkinIds, cosmetic.id] }),
  };
  publish();
  return { ok: true, coinsRemaining: state.coins };
}

export function selectCosmetic(cosmeticId: string): boolean {
  refreshSeason();
  const cosmetic = COSMETICS.find((item) => item.id === cosmeticId);
  if (!cosmetic) return false;

  const ownedIds =
    cosmetic.kind === 'personagem'
      ? state.ownedCharacterIds
      : state.ownedSkinIds;
  if (!ownedIds.includes(cosmeticId)) return false;

  state = {
    ...state,
    ...(cosmetic.kind === 'personagem'
      ? { selectedCharacterId: cosmeticId }
      : { selectedSkinId: cosmeticId }),
  };
  publish();
  return true;
}
