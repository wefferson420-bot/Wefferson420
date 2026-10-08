import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter, Link, useParams } from 'wouter';
import { ArrowDownLeft, ArrowRight, Award, Bolt, Check, ChevronRight, CircleHelp, Coins, Crown, Flame, Gamepad2, Gem, Heart, Home, LockKeyhole, Medal, Play, ShoppingBag, Sparkles, Star, Target, Trophy, UserRound, Zap, type LucideIcon } from 'lucide-react';
import {
  COSMETICS,
  claimMission,
  completeGame,
  getCurrentDailyStreak,
  getLevel,
  getLevelProgress,
  getMissions,
  getNextRankTier,
  getRankProgress,
  getRankTier,
  getSeasonDaysRemaining,
  purchaseCosmetic,
  refreshSeason,
  selectCosmetic,
  useArcadeState,
  type Cosmetic,
  type GameCompletion,
  type GamePerformance,
  type GameId,
  type PlayableGameId,
  RANK_TIERS,
  type StoreResult,
} from '@/lib/arcade-state';
import { getSkinRarityCounts, SKIN_RARITIES, type SkinRarity } from '@/lib/skin-catalog';
import { GameSession } from '@/components/games/GameSession';
import { RunnerSprite } from '@/components/games/RunnerSprite';
import { AboutPage, CoinShopPage, MissionsPage, RankingPage } from '@/pages/meta-pages';

const queryClient = new QueryClient();

export type GameScore = { gameId: PlayableGameId; score: number; completedAt: Date; performance?: GamePerformance };
export type Purchase = { itemId: string };
export type CosmeticSelection = { itemId: string };
export type ArcadeCallbacks = {
  onGameComplete?: (result: GameScore) => GameCompletion | undefined;
  onPurchase?: (purchase: Purchase) => StoreResult;
  onCosmeticSelect?: (selection: CosmeticSelection) => boolean;
};

type GameDefinition = { id: PlayableGameId; name: string; description: string; category: string; duration: string; icon: LucideIcon; color: string; score: string };
const games: GameDefinition[] = [
  { id: 'reflexo', name: 'Reflexo relâmpago', description: 'Toque nos sinais verdadeiros e desvie das distrações.', category: 'REFLEXO', duration: '20 SEG', icon: Bolt, color: 'lime', score: 'Precisão e velocidade' },
  { id: 'memoria', name: 'Memória de bolso', description: 'Encontre os pares e avance para tabuleiros maiores.', category: 'MEMÓRIA', duration: 'POR NÍVEL', icon: Gem, color: 'violet', score: '4+ pares por nível' },
  { id: 'corrida', name: 'Corrida Infinita', description: 'Pule os obstáculos e descubra até onde vai.', category: 'CORRIDA', duration: 'SEM LIMITE', icon: Zap, color: 'orange', score: 'Distância em metros' },
];

const shopItems = COSMETICS.map((item) => ({
  ...item,
  type: item.kind === 'personagem' ? 'PERSONAGEM' : 'VISUAL',
  color: item.tone,
}));

function formatCoins(coins: number): string {
  return new Intl.NumberFormat('pt-BR').format(coins);
}

function formattedDate(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date));
}

function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function gameUnit(gameId: GameId): string {
  return gameId === 'corrida' ? 'm' : 'pts';
}

function ownsCosmetic(state: ReturnType<typeof useArcadeState>, item: Cosmetic): boolean {
  return item.kind === 'personagem'
    ? state.ownedCharacterIds.includes(item.id)
    : state.ownedSkinIds.includes(item.id);
}

function BrandMark() {
  return <div className="brand-mark"><Sparkles className="brand-spark" size={20} /><span>CHALLENGE X</span></div>;
}

function Wallet() {
  const { coins } = useArcadeState();
  return <div className="wallet" data-testid="text-wallet-balance"><span className="coin-icon"><Coins size={15} /></span><strong>{formatCoins(coins)}</strong><span className="wallet-label">fichas</span><Link href="/coin-shop" className="wallet-add" aria-label="Ver pacotes de fichas" data-testid="button-wallet-shop"><ArrowRight size={14} /></Link></div>;
}

function Shell({ children, active = 'inicio' }: { children: React.ReactNode; active?: string }) {
  const state = useArcadeState();
  const streak = getCurrentDailyStreak(state);
  const primaryNav = [
    { href: '/', label: 'Início', id: 'inicio', icon: Home },
    { href: '/games', label: 'Jogar', id: 'jogar', icon: Gamepad2 },
    { href: '/shop', label: 'Loja', id: 'loja', icon: ShoppingBag },
    { href: '/profile', label: 'Perfil', id: 'perfil', icon: UserRound },
  ];
  const extraNav = [
    { href: '/ranking', label: 'Temporada', id: 'ranking', icon: Trophy },
    { href: '/missions', label: 'Missões', id: 'missions', icon: Target },
  ];
  const desktopNav = [...primaryNav, ...extraNav];
  return <div className="app-shell">
    <aside className="desktop-rail">
      <Link href="/about" className="logo-link" aria-label="Sobre CHALLENGE X" data-testid="link-home-logo"><BrandMark /></Link>
      <div className="rail-label">ARCADE</div>
      <nav className="rail-nav">{desktopNav.map(item => <Link key={item.id} href={item.href} className={`rail-link ${active === item.id ? 'selected' : ''}`} data-testid={`link-nav-${item.id}`}><item.icon size={19} /><span>{item.label}</span></Link>)}</nav>
      <div className="rail-bottom"><div className="rail-status"><span className="online-dot" />DESAFIO DO DIA<br /><b>disponível</b></div><Link href="/about" className="rail-about-link">Sobre o jogo</Link><div className="rail-avatar">L</div></div>
    </aside>
    <main className="main-frame">
      <header className="topbar"><Link href="/about" className="mobile-brand" aria-label="Sobre CHALLENGE X" data-testid="link-home-mobile"><BrandMark /></Link><div className="topbar-spacer" /><div className="streak-pill"><Flame size={15} /><span>{streak} {streak === 1 ? 'dia' : 'dias'}</span></div><Wallet /><Link href="/profile" className="avatar-button" aria-label="Abrir perfil" data-testid="button-open-profile">J</Link></header>
      <div className="content-area">{children}</div>
      <nav className="bottom-nav">{primaryNav.map(item => <Link key={item.id} href={item.href} className={`bottom-link ${active === item.id ? 'selected' : ''}`} data-testid={`link-bottom-${item.id}`}><item.icon size={20} /><span>{item.label}</span></Link>)}</nav>
    </main>
  </div>;
}

function SectionEyebrow({ children }: { children: React.ReactNode }) { return <div className="eyebrow"><span />{children}</div>; }

function HomePage() {
  const state = useArcadeState();
  const streak = getCurrentDailyStreak(state);
  const level = getLevel(state.totalXp);
  const levelProgress = getLevelProgress(state.totalXp);
  const bestRecord = games
    .map((game) => ({ game, score: state.bestScores[game.id] ?? 0 }))
    .sort((first, second) => second.score - first.score)[0];
  const dailyComplete = state.lastDailyDate === localDateKey();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const dateLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date());
  return <Shell active="inicio"><div className="page-wrap home-page">
    <div className="greeting-row"><div><p className="date-line">{dateLabel}</p><h1>{greeting}, <em>jogador.</em></h1><p className="subhead">Bora bater seu recorde de hoje?</p></div><div className="level-chip"><span className="level-star"><Star size={13} fill="currentColor" /></span><span>NÍVEL {String(level).padStart(2, '0')}</span></div></div>
    <section className="hero-challenge" data-testid="card-daily-challenge">
      <div className="hero-grain" /><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
      <div className="hero-copy"><SectionEyebrow>DESAFIO DO DIA <span className="today-tag">{dailyComplete ? 'FEITO' : 'NOVO'}</span></SectionEyebrow><h2>Uma partida<br /><i>por dia.</i></h2><p>Jogue qualquer minijogo para manter sua sequência e ganhar fichas extras.</p><div className="hero-meta"><span><Target size={14} /> {dailyComplete ? 'DESAFIO CONCLUÍDO' : 'JOGUE UMA PARTIDA'}</span><span><Coins size={14} /> +20 fichas</span></div><Link href="/games" className="button-primary" data-testid="button-play-daily"><Play size={15} fill="currentColor" /> {dailyComplete ? 'Jogar de novo' : 'Encarar desafio'} <ArrowRight size={16} /></Link></div>
      <div className="hero-art"><div className="art-ring ring-a" /><div className="art-ring ring-b" /><div className="arcade-token"><Bolt size={78} strokeWidth={1.7} fill="currentColor" /></div><Sparkles className="art-spark spark-a" size={23} /><Sparkles className="art-spark spark-b" size={30} /><div className="score-bubble">+20 <small>FICHAS</small></div></div>
      <div className="hero-foot"><span>SUA SEQUÊNCIA</span><strong>{streak} <small>{streak === 1 ? 'dia' : 'dias'}</small></strong><div className="mini-progress"><span style={{ width: `${Math.min(100, streak * 20)}%` }} /></div></div>
    </section>
    <div className="section-heading"><div><SectionEyebrow>UM MINUTO PRA VOCÊ</SectionEyebrow><h2>Vai mais uma?</h2></div><Link href="/games" className="text-link" data-testid="link-all-games">Ver todos <ArrowRight size={15} /></Link></div>
    <div className="quick-games">{games.slice(0, 2).map((game, i) => <GameTile key={game.id} game={game} index={i} />)}</div>
     <Link href="/play/corrida" className="race-feature" data-testid="card-game-corrida">
       <div className="race-feature-copy"><SectionEyebrow>NOVO MODO · SEM CRONÔMETRO</SectionEyebrow><h3>Corrida <i>Infinita</i></h3><p>Pule obstáculos, aumente o ritmo e busque sua maior distância.</p><span>COMEÇAR CORRIDA <ArrowRight size={14} /></span></div>
       <div className="race-feature-art"><div className="race-feature-glow" /><RunnerSprite characterId={state.selectedCharacterId} skinId={state.selectedSkinId} running /></div>
     </Link>
     <div className="home-meta-links">
       <Link href="/ranking" className="home-meta-link"><span className="home-meta-icon rank"><Trophy size={17} /></span><span><small>TEMPORADA LOCAL</small><strong>{getRankTier(state.season.points).label} · {formatCoins(state.season.points)} pts</strong></span><ArrowRight size={14} /></Link>
       <Link href="/missions" className="home-meta-link"><span className="home-meta-icon mission"><Target size={17} /></span><span><small>OBJETIVOS DO ARCADE</small><strong>Missões e recompensas</strong></span><ArrowRight size={14} /></Link>
        <Link href="/shop" className="home-meta-link"><span className="home-meta-icon skins"><Sparkles size={17} /></span><span><small>VISUAL DO PERSONAGEM</small><strong>Loja, personagens e skins</strong></span><ArrowRight size={14} /></Link>
        <Link href="/profile" className="home-meta-link"><span className="home-meta-icon record"><Award size={17} /></span><span><small>SEU MELHOR RESULTADO</small><strong>{bestRecord.score ? `${bestRecord.game.name}: ${formatCoins(bestRecord.score)} ${gameUnit(bestRecord.game.id)}` : 'Jogue para criar seu recorde'}</strong></span><ArrowRight size={14} /></Link>
     </div>
      <section className="progress-strip"><div className="progress-icon"><Trophy size={20} /></div><div className="progress-copy"><b>{levelProgress >= 75 ? 'Quase lá!' : 'Seu próximo nível'}</b><span>{formatCoins(state.totalXp)} XP acumulados · mais {100 - levelProgress} para avançar.</span></div><div className="progress-value">{levelProgress} <small>/ 100 XP</small></div><div className="xp-track"><span style={{ width: `${levelProgress}%` }} /></div></section>
    <p className="no-bet-note"><LockKeyhole size={13} /> Só diversão: aqui suas fichas são virtuais e não têm valor em dinheiro.</p>
  </div></Shell>;
}

function GameTile({ game, index = 0 }: { game: typeof games[number]; index?: number }) {
  const Icon = game.icon;
  return <Link href={`/play/${game.id}`} className={`game-tile tone-${game.color}`} data-testid={`card-game-${game.id}`}><div className="tile-top"><span className="tile-icon"><Icon size={20} /></span><span className="tile-duration">{game.duration}</span></div><div className="tile-copy"><span className="tile-category">{game.category}</span><h3>{game.name}</h3><p>{game.description}</p></div><div className="tile-footer"><span>{game.score}</span><span className="tile-arrow"><ArrowRight size={16} /></span></div><span className="tile-index">0{index + 1}</span></Link>;
}

function GamesPage() {
  const [filter, setFilter] = useState('TODOS');
  const filters = ['TODOS', 'REFLEXO', 'MEMÓRIA', 'CORRIDA'];
  const visible = filter === 'TODOS' ? games : games.filter(g => g.category === filter);
  return <Shell active="jogar"><div className="page-wrap">
    <div className="page-heading"><div><SectionEyebrow>ESCOLHA SEU DESAFIO</SectionEyebrow><h1>Qual vai ser?</h1><p>Partidas rápidas. Recordes que duram.</p></div><div className="heading-mark"><Gamepad2 size={28} /></div></div>
    <div className="filter-row" role="tablist" aria-label="Filtrar jogos">{filters.map(item => <button key={item} className={`filter-button ${filter === item ? 'active' : ''}`} onClick={() => setFilter(item)} data-testid={`button-filter-${item.toLowerCase()}`}>{item}</button>)}</div>
    <div className="games-grid">{visible.map((game, i) => <GameTile key={game.id} game={game} index={games.indexOf(game)} />)}</div>
    <div className="games-note"><div className="note-icon"><CircleHelp size={18} /></div><div><b>Como funciona?</b><p>Jogue, pratique e melhore sua pontuação. Suas fichas são virtuais — sem apostas, sem dinheiro real.</p></div></div>
  </div></Shell>;
}

function PlayPage({ onGameComplete }: Pick<ArcadeCallbacks, 'onGameComplete'>) {
  const { gameId = 'reflexo' } = useParams<{ gameId: string }>();
  const game = games.find((candidate) => candidate.id === gameId);
  if (!game) return <NotFound />;
  return <Shell active="jogar"><GameSession key={game.id} game={game} onGameComplete={onGameComplete} /></Shell>;
}

function ShopPage({ onPurchase, onCosmeticSelect }: Pick<ArcadeCallbacks, 'onPurchase' | 'onCosmeticSelect'>) {
  const state = useArcadeState();
  const [activeTab, setActiveTab] = useState('TUDO');
  const [activeRarity, setActiveRarity] = useState<'TODOS' | SkinRarity>('TODOS');
  const [collectionFilter, setCollectionFilter] = useState<'TODOS' | 'COLECAO' | 'BLOQUEADAS' | 'DISPONIVEIS'>('TODOS');
  const [sortOrder, setSortOrder] = useState<'RARIDADE' | 'PRECO_CRESCENTE' | 'PRECO_DECRESCENTE' | 'NOME'>('RARIDADE');
  const [visibleCount, setVisibleCount] = useState(24);
  const [notice, setNotice] = useState('');
  const categories = ['TUDO', 'PERSONAGENS', 'VISUAIS'];
  const rarityCounts = getSkinRarityCounts();
  const categorized = shopItems.filter(item => activeTab === 'TUDO' || (activeTab === 'PERSONAGENS' ? item.type === 'PERSONAGEM' : item.type !== 'PERSONAGEM'));
  const rarityOrder = new Map(SKIN_RARITIES.map((rarity) => [rarity.id, rarity.order]));
  const filteredAll = categorized.filter((item) => {
    const isOwned = ownsCosmetic(state, item);
    const locked = !isOwned && ((item.unlockTier && state.season.points < (RANK_TIERS.find((tier) => tier.id === item.unlockTier)?.minPoints ?? Infinity)) || state.coins < item.price);
    const matchesRarity = activeRarity === 'TODOS' || (item.kind === 'skin' && item.rarity === activeRarity);
    const matchesCollection = collectionFilter === 'TODOS'
      || (collectionFilter === 'COLECAO' && isOwned)
      || (collectionFilter === 'BLOQUEADAS' && locked)
      || (collectionFilter === 'DISPONIVEIS' && !isOwned && !locked);
    return matchesRarity && matchesCollection;
  }).sort((first, second) => {
    if (sortOrder === 'PRECO_CRESCENTE') return first.price - second.price || first.name.localeCompare(second.name, 'pt-BR');
    if (sortOrder === 'PRECO_DECRESCENTE') return second.price - first.price || first.name.localeCompare(second.name, 'pt-BR');
    if (sortOrder === 'NOME') return first.name.localeCompare(second.name, 'pt-BR');
    return (rarityOrder.get(first.rarity) ?? -1) - (rarityOrder.get(second.rarity) ?? -1) || first.name.localeCompare(second.name, 'pt-BR');
  });
  const filtered = filteredAll.slice(0, visibleCount);
  const featured = shopItems.find((item) => item.id === 'nina-neon') ?? shopItems[0];
  const owned = (item: Cosmetic) => ownsCosmetic(state, item);
  const equipped = (item: Cosmetic) => item.kind === 'personagem'
    ? state.selectedCharacterId === item.id
    : state.selectedSkinId === item.id;
  const buy = (item: Cosmetic) => {
    if (owned(item)) {
      const selected = onCosmeticSelect?.({ itemId: item.id }) ?? false;
      setNotice(selected ? `${item.name} equipado.` : 'Não foi possível equipar este item.');
      return;
    }
    const result = onPurchase?.({ itemId: item.id });
    if (result?.ok) {
      setNotice(`${item.name} comprado com fichas virtuais.`);
    } else if (result?.reason === 'not-enough-coins') {
      setNotice('Você ainda não tem fichas suficientes para este item.');
    } else if (result?.reason === 'rank-required') {
      const requiredTier = RANK_TIERS.find((tier) => tier.id === item.unlockTier);
      setNotice(`Alcance a categoria ${requiredTier?.label ?? 'necessária'} para desbloquear este item.`);
    } else {
      setNotice('Não foi possível concluir essa compra.');
    }
  };
  return <Shell active="loja"><div className="page-wrap">
    <div className="page-heading shop-heading"><div><SectionEyebrow>SEU ESTILO, SUAS REGRAS</SectionEyebrow><h1>Loja de itens</h1><p>Um toque de personalidade para cada partida.</p></div><div className="shop-balance"><span><Coins size={15} /></span><div><strong>{formatCoins(state.coins)}</strong><small>FICHAS</small></div></div></div>
    <section className="featured-item"><div className="featured-copy"><span className="featured-label"><Sparkles size={13} /> DESTAQUE DA SEMANA</span><h2>Chegou a<br /><i>galera neon.</i></h2><p>Personagens com brilho próprio, direto do fliperama do futuro.</p><div className="featured-price"><span><Coins size={16} /> {featured.price}</span><button onClick={() => buy(featured)} className="button-light" data-testid="button-buy-featured">{owned(featured) ? equipped(featured) ? 'Equipado' : 'Equipar' : 'Ver personagem'} <ArrowRight size={15} /></button></div></div><div className="featured-figure"><div className="figure-halo" /><div className="figure-body">NN</div><Sparkles className="figure-star" size={23} /><div className="figure-caption">NINA<br /><small>EDIÇÃO NEON</small></div></div></section>
     <div className="section-heading shop-section-title"><div><SectionEyebrow>FEITO PRA VOCÊ</SectionEyebrow><h2>Garimpe aí</h2></div><div className="filter-row compact" role="tablist">{categories.map(category => <button key={category} className={`filter-button ${activeTab === category ? 'active' : ''}`} onClick={() => { setActiveTab(category); setActiveRarity('TODOS'); setVisibleCount(24); }} data-testid={`button-shop-filter-${category.toLowerCase()}`}>{category}</button>)}</div></div>
    <div className="skin-catalog-summary"><Sparkles size={14} /><span><strong>125 skins</strong> em 9 raridades · os itens são desbloqueados com fichas virtuais</span></div>
     <div className="skin-catalog-controls">
       <label>Exibir
         <select value={collectionFilter} onChange={(event) => { setCollectionFilter(event.target.value as typeof collectionFilter); setVisibleCount(24); }} aria-label="Filtrar itens da coleção">
           <option value="TODOS">Todos os itens</option><option value="COLECAO">Na coleção</option><option value="BLOQUEADAS">Bloqueados</option><option value="DISPONIVEIS">Disponíveis para compra</option>
         </select>
       </label>
       <label>Ordenar
         <select value={sortOrder} onChange={(event) => { setSortOrder(event.target.value as typeof sortOrder); setVisibleCount(24); }} aria-label="Ordenar itens da loja">
           <option value="RARIDADE">Raridade</option><option value="PRECO_CRESCENTE">Menor preço</option><option value="PRECO_DECRESCENTE">Maior preço</option><option value="NOME">Nome</option>
         </select>
       </label>
     </div>
     {activeTab !== 'PERSONAGENS' && <div className="skin-rarity-filters" role="group" aria-label="Filtrar skins por raridade">
      <button className={`rarity-filter ${activeRarity === 'TODOS' ? 'active' : ''}`} onClick={() => { setActiveRarity('TODOS'); setVisibleCount(24); }}>Todas <span>125</span></button>
      {SKIN_RARITIES.map((rarity) => <button key={rarity.id} className={`rarity-filter rarity-filter-${rarity.id} ${activeRarity === rarity.id ? 'active' : ''}`} onClick={() => { setActiveRarity(rarity.id); setVisibleCount(24); }} data-testid={`button-skin-rarity-${rarity.id}`}>{rarity.label}<span>{rarityCounts[rarity.id]}</span></button>)}
    </div>}
    <div className="skin-result-count" aria-live="polite">{filteredAll.length} {filteredAll.length === 1 ? 'item' : 'itens'} · exibindo {filtered.length}</div>
     <div className="shop-grid">{filtered.map(item => {
       const rarityLabel = SKIN_RARITIES.find((rarity) => rarity.id === item.rarity)?.label ?? item.rarity;
       const itemLocked = !owned(item) && ((item.unlockTier && state.season.points < (RANK_TIERS.find((tier) => tier.id === item.unlockTier)?.minPoints ?? Infinity)) || state.coins < item.price);
       return <article key={item.id} className={`shop-card item-${item.color} rarity-${item.rarity}`} data-testid={`card-shop-${item.id}`}>
         <div className="item-art"><div className="item-sprite-preview"><RunnerSprite effects={false} characterId={item.kind === 'personagem' ? item.id : state.selectedCharacterId} skinId={item.kind === 'skin' ? item.id : state.selectedSkinId} /></div><span className="item-type">{item.type} · {rarityLabel.toUpperCase()}</span>
           {owned(item) ? <span className="owned-tag"><Check size={11} /> {equipped(item) ? 'EQUIPADA' : 'NA COLEÇÃO'}</span> : itemLocked ? <span className="locked-tag"><LockKeyhole size={10} /> BLOQUEADA</span> : <span className="available-tag">DISPONÍVEL</span>}
         </div>
         <div className="item-info"><div><h3>{item.name}</h3><span>{item.description}</span></div><button className={`item-buy ${owned(item) ? 'is-owned' : ''}`} onClick={() => buy(item)} data-testid={`button-buy-${item.id}`}>{owned(item) ? equipped(item) ? 'Equipado' : 'Equipar' : item.unlockTier ? <>Categoria {RANK_TIERS.find((tier) => tier.id === item.unlockTier)?.label}</> : <><Coins size={13} /> {item.price}</>}</button></div>
       </article>;
     })}</div>
    {filtered.length < filteredAll.length && <button className="shop-load-more" onClick={() => setVisibleCount((current) => current + 24)}>Carregar mais skins <ArrowRight size={15} /></button>}
    {notice && <div className="shop-notice" role="status" data-testid="status-shop-notice"><Check size={15} />{notice}<button onClick={() => setNotice('')} aria-label="Fechar aviso">×</button></div>}
    <div className="shop-footnote"><LockKeyhole size={13} /> Itens e fichas são virtuais. Nenhuma compra envolve dinheiro real.</div>
  </div></Shell>;
}

function ProfilePage() {
  const state = useArcadeState();
  const streak = getCurrentDailyStreak(state);
  const level = getLevel(state.totalXp);
  const levelProgress = getLevelProgress(state.totalXp);
  const [shared, setShared] = useState(false);
  const reflexAttempts = state.reflexHits + state.reflexFalseHits + state.reflexMisses;
  const reflexAccuracy = reflexAttempts ? Math.round((state.reflexHits / reflexAttempts) * 100) : 0;
  const equippedSkin = COSMETICS.find((item) => item.id === state.selectedSkinId && item.kind === 'skin');
  const ownedSkinCount = COSMETICS.filter((item) => item.kind === 'skin' && state.ownedSkinIds.includes(item.id)).length;
  const achievements = [
    { name: 'Primeira partida', description: 'Complete seu primeiro jogo', unlocked: state.totalGames >= 1, icon: Gamepad2, color: 'purple' },
    { name: 'Fogo aceso', description: 'Jogue 3 dias seguidos', unlocked: streak >= 3, icon: Flame, color: 'gold' },
    { name: 'Reflexo afiado', description: 'Acerte 10 sinais verdadeiros', unlocked: state.reflexHits >= 10, icon: Zap, color: 'purple' },
    { name: 'Memória em alta', description: 'Complete três níveis de memória', unlocked: state.memoryWins >= 3, icon: Gem, color: 'purple' },
    { name: 'Pé na pista', description: 'Corra 300 metros em uma partida', unlocked: state.raceBestDistance >= 300, icon: Award, color: 'gold' },
  ];
  const unlockedAchievements = achievements.filter((badge) => badge.unlocked).length;
  const shareProfile = async () => {
    const text = `Meu progresso no CHALLENGE X: nível ${level}, ${state.totalGames} partidas e ${formatCoins(state.totalScore)} pontos.`;
    try {
      await navigator.clipboard.writeText(text);
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    } catch (error) {
      console.error('Não foi possível copiar o resumo do perfil.', error);
    }
  };
  return <Shell active="perfil"><div className="page-wrap profile-page">
    <div className="profile-cover"><div className="cover-grid" /><div className="profile-avatar">J<span className="avatar-online" /></div><div className="profile-intro"><span className="profile-label">PROGRESSO NESTE DISPOSITIVO</span><h1>Seu perfil</h1><p>Uma partida de cada vez.</p></div><div className="profile-level"><span><Star size={14} fill="currentColor" /></span><div><b>NÍVEL {String(level).padStart(2, '0')}</b><small>Arcadeiro</small></div></div></div>
    <section className="profile-xp"><div className="xp-label-row"><div><span>PROGRESSO DO NÍVEL</span><b>{levelProgress} <small>/ 100 XP</small></b></div><div className="next-level">{100 - levelProgress} XP para o próximo</div></div><div className="xp-track large"><span style={{ width: `${levelProgress}%` }} /></div></section>
    <div className="section-heading profile-stat-heading"><div><SectionEyebrow>SUAS CONQUISTAS</SectionEyebrow><h2>Olha só o que já fez</h2></div><button className="share-button" onClick={shareProfile} data-testid="button-share-profile"><ArrowDownLeft size={15} /> {shared ? 'Copiado!' : 'Compartilhar'}</button></div>
    <div className="stats-grid">
      <div className="stat-card"><div className="stat-icon violet"><Gamepad2 size={18} /></div><span>PARTIDAS JOGADAS</span><strong>{formatCoins(state.totalGames)}</strong><small>neste dispositivo</small></div>
      <div className="stat-card"><div className="stat-icon orange"><Flame size={18} /></div><span>SEQUÊNCIA ATUAL</span><strong>{streak} <i>{streak === 1 ? 'dia' : 'dias'}</i></strong><small>jogando em dias seguidos</small></div>
      <div className="stat-card"><div className="stat-icon lime"><Trophy size={18} /></div><span>PONTOS TOTAIS</span><strong>{formatCoins(state.totalScore)}</strong><small>em todas as partidas</small></div>
      <div className="stat-card"><div className="stat-icon pink"><Medal size={18} /></div><span>CONQUISTAS</span><strong>{unlockedAchievements} <i>/ {achievements.length}</i></strong><small>conquistas desbloqueadas</small></div>
      <div className="stat-card"><div className="stat-icon orange"><Zap size={18} /></div><span>OBSTÁCULOS SUPERADOS</span><strong>{formatCoins(state.raceObstaclesCleared)}</strong><small>em todas as corridas</small></div>
      <div className="stat-card"><div className="stat-icon violet"><Sparkles size={18} /></div><span>BÔNUS COLETADOS</span><strong>{formatCoins(state.raceBonusesCollected)}</strong><small>durante a Corrida Infinita</small></div>
    </div>
     <section className="profile-reflex-panel" aria-label="Estatísticas acumuladas do Reflexo">
       <div className="panel-title"><div><SectionEyebrow>REFLEXO</SectionEyebrow><h2>Suas estatísticas</h2></div><Zap size={19} /></div>
       <div className="profile-reflex-grid">
         <span><b>{formatCoins(state.reflexHits)}</b> ACERTOS</span><span><b>{formatCoins(state.reflexFalseHits + state.reflexMisses)}</b> ERROS</span><span><b>{reflexAccuracy}%</b> PRECISÃO</span>
         <span><b>{state.reflexReactionCount ? `${Math.round(state.reflexTotalReactionMs / state.reflexReactionCount)} ms` : '—'}</b> REAÇÃO MÉDIA</span><span><b>{state.bestReactionMs === null ? '—' : `${state.bestReactionMs} ms`}</b> MELHOR REAÇÃO</span><span><b>{state.reflexMaxCombo}</b> MAIOR COMBO</span>
         <span><b>{formatCoins(state.bestScores.reflexo ?? 0)}</b> RECORDE</span>
       </div>
     </section>
     <section className="profile-skin-panel">
       <div className="profile-skin-preview"><RunnerSprite characterId={state.selectedCharacterId} skinId={state.selectedSkinId} /></div>
       <div><SectionEyebrow>SUA COLEÇÃO</SectionEyebrow><h2>{equippedSkin?.name ?? 'Rastro Aurora'}</h2><p>{ownedSkinCount} de 125 skins desbloqueadas · visual equipado em seus jogos.</p></div>
       <Link href="/shop" className="profile-more">Ver coleção <ChevronRight size={15} /></Link>
     </section>
    <div className="profile-columns"><section className="record-panel"><div className="panel-title"><div><SectionEyebrow>SEUS RECORDES</SectionEyebrow><h2>Melhores marcas</h2></div><Award size={19} /></div>{games.map((game) => { const Icon = game.icon; const best = state.bestScores[game.id]; const last = state.recentResults.find((result) => result.gameId === game.id); return <div className="record-row" key={game.id}><span className={`record-game-icon ${game.color}`}><Icon size={16} /></span><div className="record-name"><b>{game.name}</b><small>{last ? `Última partida: ${formattedDate(last.playedAt)}` : 'Jogue para registrar um recorde'}</small></div><strong>{best ?? '—'} <small>{gameUnit(game.id)}</small></strong></div>; })}</section>
      <section className="badges-panel"><div className="panel-title"><div><SectionEyebrow>VITRINE</SectionEyebrow><h2>Medalhas recentes</h2></div><Crown size={19} /></div>{achievements.map((badge) => { const Icon = badge.icon; return <div className="badge-row" key={badge.name}><div className={`badge-medal badge-${badge.color}`}><Icon size={19} /></div><div><b>{badge.name}</b><small>{badge.description}</small></div><span className="badge-check">{badge.unlocked ? <Check size={13} /> : <LockKeyhole size={12} />}</span></div>; })}<Link href="/games" className="profile-more" data-testid="link-more-games">Buscar nova medalha <ChevronRight size={15} /></Link></section></div>
    <p className="profile-note"><Heart size={13} /> Seu progresso é só seu. Jogue no seu ritmo.</p>
  </div></Shell>;
}

function RankingRoute() {
  const state = useArcadeState();
  const tier = getRankTier(state.season.points);
  const nextTier = getNextRankTier(state.season.points);
  return <Shell active="ranking"><RankingPage
    points={state.season.points}
    tier={tier}
    nextTier={nextTier}
    progressPercent={getRankProgress(state.season.points)}
    daysRemaining={getSeasonDaysRemaining(state.season)}
    endsAt={state.season.endsAt}
    history={state.seasonHistory}
  /></Shell>;
}

function MissionsRoute() {
  const state = useArcadeState();
  return <Shell active="missions"><MissionsPage missions={getMissions(state)} onClaim={(missionId) => { claimMission(missionId); }} /></Shell>;
}

function CoinShopRoute() {
  const state = useArcadeState();
  return <Shell active="loja"><CoinShopPage balance={state.coins} /></Shell>;
}

function AboutRoute() {
  return <Shell active="about"><AboutPage /></Shell>;
}

function Router({ callbacks }: { callbacks: ArcadeCallbacks }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/" component={HomePage} />
    <Route path="/games" component={GamesPage} />
    <Route path="/play/:gameId"><PlayPage onGameComplete={callbacks.onGameComplete} /></Route>
    <Route path="/shop"><ShopPage onPurchase={callbacks.onPurchase} onCosmeticSelect={callbacks.onCosmeticSelect} /></Route>
    <Route path="/coin-shop" component={CoinShopRoute} />
    <Route path="/ranking" component={RankingRoute} />
    <Route path="/missions" component={MissionsRoute} />
    <Route path="/about" component={AboutRoute} />
    <Route path="/profile" component={ProfilePage} />
    <Route component={NotFound} />
  </Switch></ErrorBoundary>;
}

function App() {
  useEffect(() => {
    const refresh = () => refreshSeason();
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const callbacks: ArcadeCallbacks = {
    onGameComplete: ({ gameId, score, performance }) => completeGame(gameId, score, performance),
    onPurchase: ({ itemId }) => purchaseCosmetic(itemId),
    onCosmeticSelect: ({ itemId }) => selectCosmetic(itemId),
  };
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router callbacks={callbacks} /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
