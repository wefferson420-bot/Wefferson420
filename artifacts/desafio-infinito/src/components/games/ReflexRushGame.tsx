import { useCallback, useEffect, useRef, useState } from 'react';
import { Target } from 'lucide-react';
import type { GameModuleProps } from './game-types';

const ROUND_SECONDS = 20;

export function getReflexComboMultiplier(combo: number): number {
  if (combo >= 10) return 4;
  if (combo >= 5) return 3;
  if (combo >= 3) return 2;
  return 1;
}

interface ReflexTarget {
  id: number;
  kind: 'real' | 'false';
  x: number;
  y: number;
  size: number;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function ReflexRushGame({ playing, onProgress, onFinish }: GameModuleProps) {
  const [targets, setTargets] = useState<ReflexTarget[]>([]);
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [hits, setHits] = useState(0);
  const [falseHits, setFalseHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [chain, setChain] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [feedbackKind, setFeedbackKind] = useState<'success' | 'error' | ''>('');
  const targetsRef = useRef<ReflexTarget[]>([]);
  const scoreRef = useRef(0);
  const hitsRef = useRef(0);
  const falseHitsRef = useRef(0);
  const missesRef = useRef(0);
  const chainRef = useRef(0);
  const maxComboRef = useRef(0);
  const reactionsRef = useRef<number[]>([]);
  const waveCounterRef = useRef(0);
  const waveBornAtRef = useRef(0);
  const waveEndsAtRef = useRef(0);
  const nextWaveAtRef = useRef(0);
  const startedAtRef = useRef(0);
  const finishedRef = useRef(false);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const showTargets = useCallback((next: ReflexTarget[]) => {
    targetsRef.current = next;
    setTargets(next);
  }, []);

  const updateScore = useCallback((next: number) => {
    scoreRef.current = Math.max(0, next);
    setScore(scoreRef.current);
  }, []);

  const announce = useCallback((message: string, kind: 'success' | 'error') => {
    setFeedback(message);
    setFeedbackKind(kind);
    if (feedbackTimeoutRef.current !== null) window.clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedback('');
      setFeedbackKind('');
      feedbackTimeoutRef.current = null;
    }, 1000);
  }, []);

  const spawnWave = useCallback(() => {
    const successfulHits = hitsRef.current;
    const size = Math.max(42, 66 - Math.floor(successfulHits / 3) * 3);
    const waveIndex = waveCounterRef.current++;
    const nextId = waveIndex;
    const pattern = waveIndex % 4;
    const realPosition = pattern === 0
      ? { x: randomBetween(15, 35), y: randomBetween(20, 42) }
      : pattern === 1
        ? { x: randomBetween(65, 85), y: randomBetween(48, 70) }
        : pattern === 2
          ? { x: randomBetween(20, 40), y: randomBetween(50, 70) }
          : { x: randomBetween(60, 82), y: randomBetween(20, 43) };
    const realTarget: ReflexTarget = {
      id: nextId * 10,
      kind: 'real',
      ...realPosition,
      size,
    };
    const fakeChance = successfulHits < 3 ? 0 : Math.min(0.4, 0.1 + successfulHits * 0.025);
    const fakeCount = Math.random() < fakeChance ? 1 : 0;
    const fakeTargets = Array.from({ length: fakeCount }, (_, index): ReflexTarget => ({
      id: nextId * 10 + index + 1,
      kind: 'false',
      x: realPosition.x < 50 ? randomBetween(66, 86) : randomBetween(14, 34),
      y: realPosition.y < 46 ? randomBetween(51, 70) : randomBetween(20, 40),
      size: Math.max(40, size - 5),
    }));
    waveBornAtRef.current = Date.now();
    const reactionWindow = Math.max(420, 1450 - successfulHits * 58);
    waveEndsAtRef.current = waveBornAtRef.current + reactionWindow;
    showTargets([realTarget, ...fakeTargets]);
  }, [showTargets]);

  const reportProgress = useCallback((timeRemaining: number) => {
    onProgress(scoreRef.current, timeRemaining);
  }, [onProgress]);

  const finishRound = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    showTargets([]);
    const successfulHits = hitsRef.current;
    onFinish(scoreRef.current, {
      reflexReactionsMs: [...reactionsRef.current],
      reflexFalseHits: falseHitsRef.current,
      reflexMisses: missesRef.current,
      reflexMaxCombo: maxComboRef.current,
      coinBonus: Math.min(14, Math.floor(successfulHits / 4) * 2),
      xpBonus: Math.min(20, Math.floor(successfulHits / 3) * 2),
    });
  }, [onFinish, showTargets]);

  useEffect(() => {
    if (!playing) return;
    scoreRef.current = 0;
    hitsRef.current = 0;
    falseHitsRef.current = 0;
    missesRef.current = 0;
    chainRef.current = 0;
    maxComboRef.current = 0;
    reactionsRef.current = [];
    waveCounterRef.current = 0;
    startedAtRef.current = Date.now();
    nextWaveAtRef.current = startedAtRef.current + 500;
    finishedRef.current = false;
    if (feedbackTimeoutRef.current !== null) window.clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = null;
    showTargets([]);
    setScore(0);
    setHits(0);
    setFalseHits(0);
    setMisses(0);
    setChain(0);
    setMaxCombo(0);
    setFeedback('');
    setFeedbackKind('');
    setSecondsLeft(ROUND_SECONDS);
    reportProgress(ROUND_SECONDS);

    const tick = window.setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - startedAtRef.current;
      const timeRemaining = Math.max(0, ROUND_SECONDS - Math.floor(elapsedMs / 1000));
      setSecondsLeft(timeRemaining);
      reportProgress(timeRemaining);

      if (timeRemaining <= 0) {
        finishRound();
        return;
      }

      if (targetsRef.current.length && now >= waveEndsAtRef.current) {
        missesRef.current += 1;
        setMisses(missesRef.current);
        chainRef.current = 0;
        setChain(0);
        updateScore(scoreRef.current - 16);
        announce('O sinal escapou: −16 pontos e combo quebrado.', 'error');
        showTargets([]);
        nextWaveAtRef.current = now + Math.max(180, 560 - hitsRef.current * 25) + randomBetween(0, 240);
      } else if (!targetsRef.current.length && now >= nextWaveAtRef.current) {
        spawnWave();
      }
    }, 80);

    return () => {
      window.clearInterval(tick);
      if (feedbackTimeoutRef.current !== null) window.clearTimeout(feedbackTimeoutRef.current);
    };
  }, [playing, finishRound, reportProgress, showTargets, spawnWave, updateScore, announce]);

  const selectTarget = (target: ReflexTarget) => {
    if (!playing || finishedRef.current) return;
    if (target.kind === 'false') {
      falseHitsRef.current += 1;
      setFalseHits(falseHitsRef.current);
      chainRef.current = 0;
      setChain(0);
      updateScore(scoreRef.current - 34);
      announce('Alvo falso! −34 pontos e combo quebrado.', 'error');
      showTargets([]);
      nextWaveAtRef.current = Date.now() + 360;
      return;
    }

    const reactionMs = Math.max(0, Date.now() - waveBornAtRef.current);
    reactionsRef.current = [...reactionsRef.current, reactionMs];
    hitsRef.current += 1;
    setHits(hitsRef.current);
    chainRef.current += 1;
    setChain(chainRef.current);
    maxComboRef.current = Math.max(maxComboRef.current, chainRef.current);
    setMaxCombo(maxComboRef.current);
    const speedPoints = Math.max(6, Math.floor((1300 - reactionMs) / 14));
    const multiplier = getReflexComboMultiplier(chainRef.current);
    updateScore(scoreRef.current + Math.round((18 + speedPoints) * multiplier));
    announce(`Acerto ${multiplier}× · combo ${chainRef.current}.`, 'success');
    showTargets([]);
    nextWaveAtRef.current = Date.now() + Math.max(150, 550 - hitsRef.current * 24) + randomBetween(0, 230);
  };

  const tapEmptySpace = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !playing || finishedRef.current) return;
    missesRef.current += 1;
    setMisses(missesRef.current);
    chainRef.current = 0;
    setChain(0);
    updateScore(scoreRef.current - 12);
    announce('Toque fora do alvo! −12 pontos e combo quebrado.', 'error');
  };

  const averageReaction = reactionsRef.current.length
    ? Math.round(reactionsRef.current.reduce((sum, reaction) => sum + reaction, 0) / reactionsRef.current.length)
    : null;

  return (
    <section className="reflex-rush" aria-label="Partida de reflexo">
      <div className="reflex-live-stats">
        <span><b>{hits}</b> ACERTOS</span>
        <span><b>{averageReaction === null ? '—' : `${averageReaction} ms`}</b> MÉDIA</span>
        <span><b>{chain}</b> SEQUÊNCIA</span>
        <span><b>{getReflexComboMultiplier(chain)}×</b> MULTIPLICADOR</span>
      </div>
      <div className="reflex-arena" onPointerDown={tapEmptySpace} data-testid="reflex-arena">
        <div className="reflex-arena-grid" aria-hidden="true" />
        <div className="reflex-arena-orbit" aria-hidden="true" />
        {targets.map((target) => (
          <button
            type="button"
            key={target.id}
            className={`reflex-rush-target ${target.kind === 'false' ? 'is-false' : 'is-real'}`}
            style={{ left: `${target.x}%`, top: `${target.y}%`, width: target.size, height: target.size }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => selectTarget(target)}
            aria-label={target.kind === 'false' ? 'Alvo falso, não toque' : 'Alvo verdadeiro, toque agora'}
            data-testid={target.kind === 'false' ? 'button-false-target' : 'button-reflex-target'}
          >
            {target.kind === 'real' ? <Target size={target.size * 0.42} strokeWidth={2.2} /> : <span>FALSO</span>}
          </button>
        ))}
        {!targets.length && <div className="reflex-waiting">FIQUE DE OLHO</div>}
        {feedback && <div className={`reflex-feedback is-${feedbackKind}`} role="status" aria-live="polite">{feedback}</div>}
        <div className="reflex-arena-footer">
          <span>{falseHits + misses} ERROS</span>
          <span>MAIOR COMBO {maxCombo}</span>
        </div>
      </div>
      <p className="reflex-instruction">Toque nos sinais lilás; ignore os alvos vermelhos. Eles ficam menores e mais rápidos.</p>
      <span className="sr-only" aria-live="polite">{secondsLeft} segundos restantes</span>
    </section>
  );
}
