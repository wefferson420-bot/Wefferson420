import { useEffect, useRef, useState } from 'react';
import {
  getMemoryPairCount,
  getMemoryTimeLimit,
} from '@/lib/arcade-state';
import { RunnerSprite } from './RunnerSprite';
import type { GameModuleProps } from './game-types';

const CARD_SYMBOLS = [
  '◈', '✦', '⊙', '▲', '◇', '▧', '⌁', '✣',
  '◐', '◆', '□', '△', '⬟', '✧', '◎', '▱',
  '⬢', '✺', '◌', '⬡', '✥', '◉', '▰', '✱',
];

interface MemoryCard {
  id: number;
  pairId: number;
}

function shuffledDeck(pairCount: number): MemoryCard[] {
  const deck = Array.from({ length: pairCount * 2 }, (_, id) => ({
    id,
    pairId: Math.floor(id / 2),
  }));
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  return deck;
}

export interface MemoryMatchGameProps extends GameModuleProps {
  level: number;
  characterId: string;
  skinId: string;
  quickMode?: boolean;
}

export function MemoryMatchGame({
  playing,
  level,
  characterId,
  skinId,
  quickMode = false,
  onProgress,
  onFinish,
}: MemoryMatchGameProps) {
  const pairCount = getMemoryPairCount(level);
  const timeLimit = getMemoryTimeLimit(level, quickMode);
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [errorCards, setErrorCards] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(timeLimit);
  const [matchStreak, setMatchStreak] = useState(0);
  const [moves, setMoves] = useState(0);
  const [errors, setErrors] = useState(0);
  const [feedback, setFeedback] = useState('');
  const flippedRef = useRef<number[]>([]);
  const matchedRef = useRef<Set<number>>(new Set());
  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const maxStreakRef = useRef(0);
  const movesRef = useRef(0);
  const errorsRef = useRef(0);
  const lockedRef = useRef(false);
  const finishedRef = useRef(false);
  const startedAtRef = useRef(0);
  const firstCardAtRef = useRef(0);
  const flipTimeoutRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const updateScore = (next: number) => {
    scoreRef.current = Math.max(0, next);
    setScore(scoreRef.current);
    onProgress(scoreRef.current, timeLeft);
  };

  const finish = (cleared: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const elapsedSeconds = Math.floor((Date.now() - startedAtRef.current) / 1000);
    const targetSeconds = timeLimit ?? pairCount * 9;
    const speedBonus = cleared ? Math.min(24, Math.floor(Math.max(0, targetSeconds - elapsedSeconds) / 12)) : 0;
    const quickBonus = cleared && quickMode ? 4 : 0;
    onFinish(scoreRef.current, {
      memoryLevel: level,
      memoryCleared: cleared,
      memoryElapsedSeconds: elapsedSeconds,
      memoryMoves: movesRef.current,
      memoryErrors: errorsRef.current,
      memoryMaxCombo: maxStreakRef.current,
      memoryQuickMode: quickMode,
      xpBonus: speedBonus + quickBonus,
      coinBonus: Math.min(14, Math.floor(speedBonus / 2)) + (quickMode && cleared ? 2 : 0),
    });
  };

  useEffect(() => {
    if (!playing) return;
    const nextDeck = shuffledDeck(pairCount);
    const now = Date.now();
    startedAtRef.current = now;
    firstCardAtRef.current = 0;
    finishedRef.current = false;
    lockedRef.current = false;
    flippedRef.current = [];
    matchedRef.current = new Set();
    scoreRef.current = 0;
    streakRef.current = 0;
    maxStreakRef.current = 0;
    movesRef.current = 0;
    errorsRef.current = 0;
    if (flipTimeoutRef.current !== null) window.clearTimeout(flipTimeoutRef.current);
    if (feedbackTimeoutRef.current !== null) window.clearTimeout(feedbackTimeoutRef.current);
    flipTimeoutRef.current = null;
    feedbackTimeoutRef.current = null;
    setCards(nextDeck);
    setFlipped([]);
    setErrorCards([]);
    setMatchedPairs(new Set());
    setScore(0);
    setMatchStreak(0);
    setMoves(0);
    setErrors(0);
    setFeedback('');
    setTimeLeft(timeLimit);
    onProgress(0, timeLimit);

    if (timeLimit === null) return () => {
      if (flipTimeoutRef.current !== null) window.clearTimeout(flipTimeoutRef.current);
      if (feedbackTimeoutRef.current !== null) window.clearTimeout(feedbackTimeoutRef.current);
    };

    const timer = window.setInterval(() => {
      const remaining = Math.max(0, timeLimit - Math.floor((Date.now() - now) / 1000));
      setTimeLeft(remaining);
      onProgress(scoreRef.current, remaining);
      if (remaining <= 0) {
        window.clearInterval(timer);
        finish(false);
      }
    }, 200);

    return () => {
      window.clearInterval(timer);
      if (flipTimeoutRef.current !== null) window.clearTimeout(flipTimeoutRef.current);
      if (feedbackTimeoutRef.current !== null) window.clearTimeout(feedbackTimeoutRef.current);
    };
  }, [playing, pairCount, timeLimit, level, quickMode, onProgress]);

  const revealCard = (index: number) => {
    if (
      !playing ||
      finishedRef.current ||
      lockedRef.current ||
      flippedRef.current.includes(index) ||
      matchedRef.current.has(cards[index]?.pairId)
    ) return;

    const nextFlipped = [...flippedRef.current, index];
    flippedRef.current = nextFlipped;
    setFlipped(nextFlipped);

    if (nextFlipped.length === 1) {
      firstCardAtRef.current = Date.now();
      return;
    }

    lockedRef.current = true;
    const [firstIndex, secondIndex] = nextFlipped;
    const firstCard = cards[firstIndex];
    const secondCard = cards[secondIndex];
    movesRef.current += 1;
    setMoves(movesRef.current);

    if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
      const elapsedSeconds = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const revealDelay = Math.max(250, Math.min(800, Date.now() - firstCardAtRef.current + 180));
      streakRef.current += 1;
      maxStreakRef.current = Math.max(maxStreakRef.current, streakRef.current);
      setMatchStreak(streakRef.current);
      const speedBonus = Math.max(0, 28 - Math.floor(elapsedSeconds / 5));
      const chainBonus = Math.min(24, Math.max(0, streakRef.current - 1) * 4);
      updateScore(scoreRef.current + 28 + speedBonus + chainBonus);
      const nextMatched = new Set(matchedRef.current);
      nextMatched.add(firstCard.pairId);
      matchedRef.current = nextMatched;

      setFeedback(`Par encontrado! Sequência ${streakRef.current}.`);
      flipTimeoutRef.current = window.setTimeout(() => {
        flipTimeoutRef.current = null;
        setMatchedPairs(new Set(matchedRef.current));
        flippedRef.current = [];
        setFlipped([]);
        lockedRef.current = false;
        firstCardAtRef.current = 0;
        if (matchedRef.current.size >= pairCount) finish(true);
      }, revealDelay);
      return;
    }

    streakRef.current = 0;
    setMatchStreak(0);
    errorsRef.current += 1;
    setErrors(errorsRef.current);
    setErrorCards([firstIndex, secondIndex]);
    setFeedback('Não formou par. A sequência foi quebrada.');
    updateScore(scoreRef.current - 10);
    flipTimeoutRef.current = window.setTimeout(() => {
      flipTimeoutRef.current = null;
      flippedRef.current = [];
      setFlipped([]);
      setErrorCards([]);
      lockedRef.current = false;
      firstCardAtRef.current = 0;
    }, 720);
  };

  const columns = pairCount <= 8 ? 4 : pairCount <= 12 ? 5 : pairCount <= 18 ? 6 : 7;
  const matchedCount = matchedPairs.size;

  return (
    <section className="memory-match" aria-label="Partida de memória">
      <div className="memory-match-heading">
        <div className="memory-level-copy">
          <span className="stage-kicker">NÍVEL {String(level).padStart(2, '0')}</span>
          <strong>{pairCount} pares</strong>
          <span>{timeLimit ? `${timeLimit} segundos para resolver` : 'Sem limite de tempo neste nível'}</span>
        </div>
        <RunnerSprite characterId={characterId} skinId={skinId} className="memory-mascot" />
      </div>
      <div className={`memory-board memory-columns-${columns}`} style={{ '--memory-columns': columns } as React.CSSProperties}>
        {cards.map((card, index) => {
          const isOpen = flipped.includes(index) || matchedPairs.has(card.pairId);
          const isMatched = matchedPairs.has(card.pairId);
          const symbol = CARD_SYMBOLS[card.pairId] ?? String(card.pairId + 1).padStart(2, '0');
          const hue = (card.pairId * 47 + 260) % 360;
          return (
            <button
              type="button"
              key={card.id}
              className={`memory-match-card ${isOpen ? 'is-open' : ''} ${isMatched ? 'is-matched' : ''} ${errorCards.includes(index) ? 'is-error' : ''}`}
              onClick={() => revealCard(index)}
              disabled={isMatched || !playing}
              aria-label={isOpen ? `Carta ${index + 1}, símbolo ${symbol}` : `Revelar carta ${index + 1}`}
              aria-pressed={isOpen}
              style={{ '--card-hue': hue } as React.CSSProperties}
              data-testid={`button-memory-card-${index}`}
            >
              <span className="memory-card-back-mark" aria-hidden="true" />
              {isOpen && <span className="memory-card-symbol" aria-hidden="true">{symbol}</span>}
            </button>
          );
        })}
      </div>
      <div className="memory-match-footer">
        <span>{matchedCount} <i>/</i> {pairCount} PARES</span>
        <span>SEQUÊNCIA <b>{matchStreak}</b></span>
        <span>TENTATIVAS <b>{moves}</b></span>
        <span>ERROS <b>{errors}</b></span>
        {timeLeft !== null && <span>TEMPO <b>{timeLeft}s</b></span>}
      </div>
      <p className={`memory-match-feedback ${feedback.startsWith('Par') ? 'is-success' : feedback ? 'is-error' : ''}`} aria-live="polite">{feedback || `${matchedCount} de ${pairCount} pares encontrados`}</p>
      <p className="memory-match-hint">
        {timeLimit
          ? `Cada acerto rápido vale mais. Erros descontam pontos.${quickMode ? ' Modo rápido concluído dá bônus extra.' : ''}`
          : 'Observe os símbolos, encontre os pares e avance para um tabuleiro maior.'}
      </p>
      <span className="sr-only" aria-live="polite">
        {timeLeft === null ? `${matchedCount} de ${pairCount} pares encontrados` : `${timeLeft} segundos restantes`}
      </span>
    </section>
  );
}
