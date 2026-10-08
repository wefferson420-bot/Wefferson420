import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowUp, Gauge, Magnet, Shield, Sparkles, Sword, Wind, Zap } from 'lucide-react';
import { RunnerSprite } from './RunnerSprite';
import type { GameModuleProps } from './game-types';
import { useArcadeState } from '@/lib/arcade-state';
import {
  generateRaceChallenge,
  getRaceDifficulty,
  MAX_RUNNER_JUMP_PX,
  RACE_OBSTACLE_METRICS,
  rememberRaceChallenge,
  type RaceObstacleKind,
  type RaceObstacleMotion,
  type RacePhaseCue,
} from '@/lib/race-generation';

type RacePhase = 'CORRIDA' | 'BÔNUS' | 'COMBATE' | 'COMBINAÇÃO';
type RunAnimation = 'RUN' | 'JUMP' | 'ATTACK' | 'HIT';
type RunBonusKind = 'speed' | 'shield' | 'magnet' | 'sword' | 'multiplier' | 'super-jump';
type PickupKind = RunBonusKind | 'coin';

interface RunObstacle {
  id: number;
  x: number;
  kind: RaceObstacleKind;
  motion?: RaceObstacleMotion;
  phase: number;
  previousX: number;
  passed: boolean;
}

interface RunPickup {
  id: number;
  kind: PickupKind;
  x: number;
  y: number;
  phase: number;
}

interface RunWorld {
  distance: number;
  playerY: number;
  jumpVelocity: number;
  coyoteUntil: number;
  jumpBufferUntil: number;
  lastInputAt: number;
  obstacles: RunObstacle[];
  pickups: RunPickup[];
  nextChallengeIn: number;
  nextPickupIn: number;
  nextId: number;
  lastFrameAt: number;
  lastHudAt: number;
  startedAt: number;
  stopped: boolean;
  phase: RacePhase;
  adaptation: number;
  patternMemory: { patternIds: string[]; sequenceKeys: string[] };
  activeBonuses: Partial<Record<RunBonusKind, number>>;
  shieldCharges: number;
  attackUntil: number;
  attackReadyAt: number;
  hitUntil: number;
  obstaclesCleared: number;
  enemiesDefeated: number;
  bonusesCollected: number;
  coinRewards: number;
  xpRewards: number;
  feedback: string;
  feedbackUntil: number;
  random: () => number;
}

interface RunScene {
  distance: number;
  speed: number;
  phase: RacePhase;
  animation: RunAnimation;
  obstacles: RunObstacle[];
  pickups: RunPickup[];
  activeBonuses: Array<{ kind: RunBonusKind; seconds: number }>;
  feedback: string;
}

const BONUS_DETAILS: Record<RunBonusKind, { label: string; duration: number }> = {
  speed: { label: 'Velocidade', duration: 6 },
  shield: { label: 'Escudo', duration: 9 },
  magnet: { label: 'Ímã', duration: 9 },
  sword: { label: 'Espada', duration: 8 },
  multiplier: { label: 'Multiplicador x2', duration: 10 },
  'super-jump': { label: 'Pulo especial', duration: 9 },
};

const BONUS_ORDER: PickupKind[] = ['shield', 'magnet', 'sword', 'multiplier', 'super-jump', 'speed', 'coin'];
const PLAYER_WIDTH = 48;
const PLAYER_HEIGHT = 58;
const GRAVITY = 1450;
const BASE_JUMP_VELOCITY = Math.sqrt(2 * GRAVITY * MAX_RUNNER_JUMP_PX);
const BONUS_KEYS: RunBonusKind[] = ['speed', 'shield', 'magnet', 'sword', 'multiplier', 'super-jump'];

function phaseForDistance(distance: number): RacePhase {
  const index = Math.floor(Math.max(0, distance) / 180) % 4;
  return (['CORRIDA', 'BÔNUS', 'COMBATE', 'COMBINAÇÃO'] as const)[index];
}

function animationFor(world: RunWorld, now: number): RunAnimation {
  if (world.hitUntil > now) return 'HIT';
  if (world.attackUntil > now) return 'ATTACK';
  if (world.playerY > 1) return 'JUMP';
  return 'RUN';
}

function activeBonusList(world: RunWorld, now: number) {
  return BONUS_KEYS
    .filter((kind) => (world.activeBonuses[kind] ?? 0) > now)
    .map((kind) => ({ kind, seconds: Math.ceil(((world.activeBonuses[kind] ?? now) - now) / 1000) }));
}

function obstacleLift(obstacle: RunObstacle, now: number): number {
  if (!obstacle.motion) return 0;
  if (obstacle.kind === 'drone') return 20 + Math.sin(now * 0.004 + obstacle.phase) * 10;
  if (obstacle.kind === 'enemy') return 4 + Math.sin(now * 0.005 + obstacle.phase) * 8;
  return 12 + Math.sin(now * 0.003 + obstacle.phase) * 12;
}

function attachNode<T extends HTMLElement>(map: Map<number, T>, id: number, node: T | null) {
  if (node) map.set(id, node);
  else map.delete(id);
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

export interface EndlessRunGameProps extends GameModuleProps {
  characterId: string;
  skinId: string;
}

export function EndlessRunGame({
  playing,
  characterId,
  skinId,
  onProgress,
  onFinish,
}: EndlessRunGameProps) {
  const arcade = useArcadeState();
  const [scene, setScene] = useState<RunScene>({
    distance: 0,
    speed: 1,
    phase: 'CORRIDA',
    animation: 'RUN',
    obstacles: [],
    pickups: [],
    activeBonuses: [],
    feedback: '',
  });
  const worldRef = useRef<RunWorld | null>(null);
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const groundRef = useRef<HTMLDivElement | null>(null);
  const farSceneryRef = useRef<HTMLDivElement | null>(null);
  const nearSceneryRef = useRef<HTMLDivElement | null>(null);
  const obstacleNodesRef = useRef(new Map<number, HTMLDivElement>());
  const pickupNodesRef = useRef(new Map<number, HTMLDivElement>());
  const callbacksRef = useRef({ onProgress, onFinish });
  const jumpInputRef = useRef<() => void>(() => {});
  const attackInputRef = useRef<() => void>(() => {});

  callbacksRef.current = { onProgress, onFinish };

  const publishScene = (world: RunWorld, now: number) => {
    const difficulty = getRaceDifficulty(world.distance, world.adaptation);
    const activeBonuses = activeBonusList(world, now);
    setScene({
      distance: Math.floor(world.distance),
      speed: Number((difficulty.speedMultiplier * ((world.activeBonuses.speed ?? 0) > now ? 1.2 : 1)).toFixed(1)),
      phase: world.phase,
      animation: animationFor(world, now),
      obstacles: [...world.obstacles],
      pickups: [...world.pickups],
      activeBonuses,
      feedback: world.feedbackUntil > now ? world.feedback : '',
    });
  };

  const requestJump = () => {
    const world = worldRef.current;
    const now = performance.now();
    if (!playing || !world || world.stopped || now - world.lastInputAt < 75) return;
    world.lastInputAt = now;
    world.jumpBufferUntil = now + 145;
    if (world.playerY <= 1 || now <= world.coyoteUntil) {
      const specialJump = (world.activeBonuses['super-jump'] ?? 0) > now;
      world.jumpVelocity = BASE_JUMP_VELOCITY * (specialJump ? 1.18 : 1);
      world.coyoteUntil = 0;
      world.jumpBufferUntil = 0;
    }
  };

  const requestAttack = () => {
    const world = worldRef.current;
    const now = performance.now();
    if (!playing || !world || world.stopped || now < world.attackReadyAt) return;
    world.attackReadyAt = now + 460;
    world.attackUntil = now + 260;
    const arenaWidth = arenaRef.current?.clientWidth ?? 360;
    const playerWidth = playerRef.current?.offsetWidth || PLAYER_WIDTH;
    const runnerLeft = arenaWidth * 0.12;
    const runnerRight = runnerLeft + playerWidth;
    const swordBonus = (world.activeBonuses.sword ?? 0) > now;
    const reach = swordBonus ? 172 : 118;
    const enemy = world.obstacles.find((obstacle) =>
      obstacle.kind === 'enemy' &&
      obstacle.x <= runnerRight + reach &&
      obstacle.x + RACE_OBSTACLE_METRICS[obstacle.kind].width >= runnerLeft - 6,
    );
    if (enemy) {
      world.obstacles = world.obstacles.filter((obstacle) => obstacle.id !== enemy.id);
      world.enemiesDefeated += 1;
      world.coinRewards += 3 * ((world.activeBonuses.multiplier ?? 0) > now ? 2 : 1);
      world.xpRewards += 5;
      world.feedback = 'SENTINELA DERROTADA · +FICHAS';
      world.feedbackUntil = now + 1000;
    } else {
      world.feedback = 'ATAQUE';
      world.feedbackUntil = now + 500;
    }
    publishScene(world, now);
  };

  jumpInputRef.current = requestJump;
  attackInputRef.current = requestAttack;

  useEffect(() => {
    if (!playing) {
      worldRef.current = null;
      return;
    }

    const startAt = performance.now();
    const randomSeed = Math.floor(Math.random() * 0xffffffff);
    let seed = randomSeed >>> 0;
    const random = () => {
      seed += 0x6d2b79f5;
      let value = seed;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    const world: RunWorld = {
      distance: 0,
      playerY: 0,
      jumpVelocity: 0,
      coyoteUntil: startAt + 100,
      jumpBufferUntil: 0,
      lastInputAt: -Infinity,
      obstacles: [],
      pickups: [],
      nextChallengeIn: 1.05,
      nextPickupIn: 9,
      nextId: 0,
      lastFrameAt: startAt,
      lastHudAt: startAt,
      startedAt: startAt,
      stopped: false,
      phase: 'CORRIDA',
      adaptation: arcade.raceAdaptation,
      patternMemory: {
        patternIds: arcade.raceRecentPatternIds.slice(-8),
        sequenceKeys: arcade.raceRecentSequenceKeys.slice(-8),
      },
      activeBonuses: {},
      shieldCharges: 0,
      attackUntil: 0,
      attackReadyAt: 0,
      hitUntil: 0,
      obstaclesCleared: 0,
      enemiesDefeated: 0,
      bonusesCollected: 0,
      coinRewards: 0,
      xpRewards: 0,
      feedback: '',
      feedbackUntil: 0,
      random,
    };
    worldRef.current = world;
    obstacleNodesRef.current.clear();
    pickupNodesRef.current.clear();
    setScene({
      distance: 0,
      speed: 1,
      phase: 'CORRIDA',
      animation: 'RUN',
      obstacles: [],
      pickups: [],
      activeBonuses: [],
      feedback: '',
    });
    callbacksRef.current.onProgress(0, null);

    let frameId = 0;
    let previousPhase = world.phase;
    const tick = (frameAt: number) => {
      if (world.stopped || worldRef.current !== world) return;
      const elapsed = Math.min(0.04, Math.max(0, (frameAt - world.lastFrameAt) / 1000));
      world.lastFrameAt = frameAt;

      const difficulty = getRaceDifficulty(world.distance, world.adaptation);
      const speedBoost = (world.activeBonuses.speed ?? 0) > frameAt ? 1.2 : 1;
      const speedPixelsPerSecond = difficulty.speedPixelsPerSecond * speedBoost;
      world.distance += difficulty.speedMetersPerSecond * speedBoost * elapsed;
      world.phase = phaseForDistance(world.distance);
      if (world.phase !== previousPhase) {
        previousPhase = world.phase;
        world.feedback = `FASE · ${world.phase}`;
        world.feedbackUntil = frameAt + 1150;
      }

      if (world.jumpBufferUntil > frameAt && world.playerY <= 1) {
        const specialJump = (world.activeBonuses['super-jump'] ?? 0) > frameAt;
        world.jumpVelocity = BASE_JUMP_VELOCITY * (specialJump ? 1.18 : 1);
        world.jumpBufferUntil = 0;
      }
      if (world.playerY > 0 || world.jumpVelocity > 0) {
        world.jumpVelocity -= GRAVITY * elapsed;
        world.playerY = Math.max(0, world.playerY + world.jumpVelocity * elapsed);
        if (world.playerY === 0) {
          world.jumpVelocity = 0;
          world.coyoteUntil = frameAt + 100;
        }
      } else {
        world.coyoteUntil = frameAt + 100;
      }

      world.nextChallengeIn -= elapsed;
      if (world.nextChallengeIn <= 0) {
        const challenge = generateRaceChallenge(
          world.distance,
          world.patternMemory,
          world.random,
          world.adaptation,
          world.phase as RacePhaseCue,
        );
        world.patternMemory = rememberRaceChallenge(world.patternMemory, challenge);
        const arenaWidth = arenaRef.current?.clientWidth ?? 360;
        let obstacleX = arenaWidth + 70 + challenge.leadOffsetPx;
        challenge.obstacles.forEach((spec) => {
          obstacleX += spec.gapAfterSeconds * speedPixelsPerSecond;
          world.obstacles.push({
            id: world.nextId++,
            x: obstacleX,
            previousX: obstacleX,
            kind: spec.kind,
            motion: spec.motion,
            phase: spec.phase,
            passed: false,
          });
        });
        world.nextChallengeIn = Math.max(
          challenge.cooldownSeconds,
          challenge.totalSpanSeconds + 1.18,
        );
      }

      world.nextPickupIn -= elapsed;
      if (world.nextPickupIn <= 0 && world.distance >= 55) {
        const arenaWidth = arenaRef.current?.clientWidth ?? 360;
        const picked = BONUS_ORDER[Math.floor(world.random() * BONUS_ORDER.length)];
        world.pickups.push({
          id: world.nextId++,
          kind: picked,
          x: arenaWidth + 80 + world.random() * 60,
          y: 38 + world.random() * 44,
          phase: world.random() * Math.PI * 2,
        });
        world.nextPickupIn = (world.phase === 'BÔNUS' ? 10 : 14) + world.random() * 5;
      }

      const arenaWidth = arenaRef.current?.clientWidth ?? 360;
      const playerWidth = playerRef.current?.offsetWidth || PLAYER_WIDTH;
      const playerHeight = playerRef.current?.offsetHeight || PLAYER_HEIGHT;
      const runnerLeft = arenaWidth * 0.12;
      const runnerRight = runnerLeft + playerWidth;
      const runnerBodyLeft = runnerLeft + playerWidth * 0.22;
      const runnerBodyRight = runnerRight - playerWidth * 0.18;
      const runnerBodyBottom = world.playerY + playerHeight * 0.12;
      const runnerBodyTop = world.playerY + playerHeight * 0.88;

      for (const obstacle of world.obstacles) {
        obstacle.previousX = obstacle.x;
        obstacle.x -= speedPixelsPerSecond * elapsed;
        const size = RACE_OBSTACLE_METRICS[obstacle.kind];
        const lifted = obstacleLift(obstacle, frameAt);
        const obstacleBodyLeft = obstacle.x + size.width * 0.2;
        const obstacleBodyRight = obstacle.x + size.width * 0.8;
        const obstacleBodyBottom = lifted + size.height * 0.1;
        const obstacleBodyTop = lifted + size.height * 0.88;
        const crossedRunner =
          Math.min(obstacle.previousX, obstacle.x) < runnerBodyRight &&
          Math.max(obstacle.previousX + size.width, obstacle.x + size.width) > runnerBodyLeft;
        const overlapsVertically =
          runnerBodyBottom < obstacleBodyTop &&
          runnerBodyTop > obstacleBodyBottom;

        const obstacleNode = obstacleNodesRef.current.get(obstacle.id);
        if (obstacleNode) {
          obstacleNode.style.transform = `translate3d(${obstacle.x}px, ${-lifted}px, 0)`;
        }
        if (obstacle.kind === 'enemy' && world.attackUntil > frameAt && crossedRunner) {
          world.obstacles = world.obstacles.filter((candidate) => candidate.id !== obstacle.id);
          world.enemiesDefeated += 1;
          world.coinRewards += 3;
          world.xpRewards += 5;
          world.feedback = 'SENTINELA DERROTADA · +FICHAS';
          world.feedbackUntil = frameAt + 1000;
          continue;
        }
        if (crossedRunner && overlapsVertically) {
          if (world.shieldCharges > 0 && (world.activeBonuses.shield ?? 0) > frameAt) {
            world.shieldCharges -= 1;
            world.activeBonuses.shield = 0;
            world.obstacles = world.obstacles.filter((candidate) => candidate.id !== obstacle.id);
            world.hitUntil = frameAt + 330;
            world.feedback = 'ESCUDO BLOQUEOU O IMPACTO';
            world.feedbackUntil = frameAt + 1100;
            continue;
          }
          world.stopped = true;
          const distance = Math.floor(world.distance);
          callbacksRef.current.onProgress(distance, null);
          callbacksRef.current.onFinish(distance, {
            distance,
            raceScore: distance,
            obstaclesCleared: world.obstaclesCleared,
            survivalMs: Math.floor(frameAt - world.startedAt),
            enemiesDefeated: world.enemiesDefeated,
            bonusesCollected: world.bonusesCollected,
            racePatternIds: world.patternMemory.patternIds,
            raceSequenceKeys: world.patternMemory.sequenceKeys,
            coinBonus: Math.min(80, Math.floor(distance / 80) * 2 + world.coinRewards),
            xpBonus: Math.min(100, Math.floor(distance / 55) * 2 + world.xpRewards),
          });
          return;
        }
        if (!obstacle.passed && obstacle.x + size.width < runnerBodyLeft) {
          obstacle.passed = true;
          world.obstaclesCleared += 1;
        }
      }

      world.pickups = world.pickups.filter((pickup) => {
        pickup.x -= speedPixelsPerSecond * elapsed;
        const pickupNode = pickupNodesRef.current.get(pickup.id);
        const bob = Math.sin(frameAt * 0.005 + pickup.phase) * 4;
        if (pickupNode) pickupNode.style.transform = `translate3d(${pickup.x}px, ${-pickup.y + bob}px, 0)`;
        const magnetActive = (world.activeBonuses.magnet ?? 0) > frameAt;
        const horizontalRange = magnetActive ? 150 : 48;
        const closeEnough = pickup.x <= runnerRight + horizontalRange && pickup.x + 28 >= runnerLeft - 8;
        const verticalDistance = Math.abs(pickup.y - world.playerY - playerHeight * 0.55);
        if (closeEnough && (magnetActive || verticalDistance < 80)) {
          world.bonusesCollected += 1;
          if (pickup.kind === 'coin') {
            world.coinRewards += (world.activeBonuses.multiplier ?? 0) > frameAt ? 6 : 3;
            world.feedback = (world.activeBonuses.multiplier ?? 0) > frameAt ? 'FICHA · RECOMPENSA x2' : 'FICHA COLETADA';
            world.feedbackUntil = frameAt + 800;
          } else {
            const bonus = pickup.kind;
            world.activeBonuses[bonus] = frameAt + BONUS_DETAILS[bonus].duration * 1000;
            if (bonus === 'shield') world.shieldCharges = 1;
            world.feedback = `BÔNUS · ${BONUS_DETAILS[bonus].label.toUpperCase()}`;
            world.feedbackUntil = frameAt + 1000;
          }
          return false;
        }
        return pickup.x > -80;
      });

      world.obstacles = world.obstacles.filter((obstacle) =>
        obstacle.x > -RACE_OBSTACLE_METRICS[obstacle.kind].width - 20,
      );
      if (playerRef.current) {
        playerRef.current.style.transform = `translate3d(0, ${-world.playerY}px, 0)`;
        playerRef.current.dataset.animation = animationFor(world, frameAt);
      }
      if (groundRef.current) {
        groundRef.current.style.backgroundPositionX = `${-((world.distance * 23) % 134)}px`;
      }
      if (farSceneryRef.current) {
        farSceneryRef.current.style.backgroundPositionX = `${-((world.distance * 3) % 170)}px`;
      }
      if (nearSceneryRef.current) {
        nearSceneryRef.current.style.backgroundPositionX = `${-((world.distance * 8) % 120)}px`;
      }

      if (frameAt - world.lastHudAt >= 110) {
        world.lastHudAt = frameAt;
        publishScene(world, frameAt);
        callbacksRef.current.onProgress(Math.floor(world.distance), null);
      }
      frameId = window.requestAnimationFrame(tick);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.code === 'Space' || event.code === 'ArrowUp') {
        event.preventDefault();
        jumpInputRef.current();
      } else if (event.code === 'KeyX' || event.code === 'KeyZ' || event.code === 'ShiftLeft') {
        event.preventDefault();
        attackInputRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    frameId = window.requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.cancelAnimationFrame(frameId);
      world.stopped = true;
      if (worldRef.current === world) worldRef.current = null;
      obstacleNodesRef.current.clear();
      pickupNodesRef.current.clear();
    };
  }, [playing]);

  const handleTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('.run-control')) return;
    event.preventDefault();
    requestJump();
  };

  const groundInset = (groundRef.current?.clientHeight ?? 66) - 1;

  const bonusIcon = (kind: RunBonusKind) => {
    if (kind === 'speed') return <Wind size={14} />;
    if (kind === 'shield') return <Shield size={14} />;
    if (kind === 'magnet') return <Magnet size={14} />;
    if (kind === 'sword') return <Sword size={14} />;
    if (kind === 'multiplier') return <Sparkles size={14} />;
    return <Zap size={14} />;
  };

  return (
    <section className="endless-run-game" aria-label="Corrida Infinita">
      <div
        className="run-viewport"
        ref={arenaRef}
        onPointerDown={handleTrackPointerDown}
        tabIndex={0}
        data-testid="endless-run-viewport"
      >
        <div className="run-sky" aria-hidden="true">
          <div className="run-moon" />
          <div className="run-skyline skyline-far" ref={farSceneryRef} />
          <div className="run-skyline skyline-near" ref={nearSceneryRef} />
          <div className="run-orbit run-orbit-one" />
          <div className="run-orbit run-orbit-two" />
          <div className="run-cloud cloud-a" />
          <div className="run-cloud cloud-b" />
        </div>
        <div className="run-hud" aria-live="polite">
          <span><b>{scene.distance}</b> m <small>DISTÂNCIA</small></span>
          <span><Gauge size={13} /> <b>{scene.speed.toFixed(1)}x</b> <small>RITMO</small></span>
        </div>
        <div className={`run-phase phase-${scene.phase.toLowerCase()}`}>{scene.phase}</div>
        {scene.activeBonuses.length > 0 && (
          <div className="run-active-bonuses" aria-label="Bônus ativos">
            {scene.activeBonuses.map(({ kind, seconds }) => (
              <span className={`active-bonus bonus-${kind}`} key={kind}>
                {bonusIcon(kind)} {BONUS_DETAILS[kind].label} <b>{seconds}s</b>
              </span>
            ))}
          </div>
        )}
        {scene.feedback && <div className="run-feedback" role="status">{scene.feedback}</div>}
        <div className="run-world-track" aria-hidden="true">
          <div className="run-forest" />
          <div className="run-ground" ref={groundRef} />
          <div className="run-ground-highlight" />
          {scene.pickups.map((pickup) => (
            <div
              key={pickup.id}
              ref={(node) => attachNode(pickupNodesRef.current, pickup.id, node)}
              className={`run-pickup pickup-${pickup.kind}`}
              style={{ left: 0, bottom: groundInset, transform: `translate3d(${pickup.x}px, ${-pickup.y}px, 0)` }}
            >
              {pickup.kind === 'coin' ? <Sparkles size={17} /> : bonusIcon(pickup.kind)}
            </div>
          ))}
          {scene.obstacles.map((obstacle) => {
            const metrics = RACE_OBSTACLE_METRICS[obstacle.kind];
            const motionY = obstacleLift(obstacle, performance.now());
            return (
              <div
                key={obstacle.id}
                ref={(node) => attachNode(obstacleNodesRef.current, obstacle.id, node)}
                className={`run-obstacle obstacle-${obstacle.kind}`}
                style={{
                  left: 0,
                  bottom: groundInset,
                  width: metrics.width,
                  height: metrics.height,
                  transform: `translate3d(${obstacle.x}px, ${-motionY}px, 0)`,
                }}
              >
                <span />
              </div>
            );
          })}
          <div className="run-character-holder" ref={playerRef} data-animation={scene.animation}>
            <RunnerSprite
              characterId={characterId}
              skinId={skinId}
              running
              animation={scene.animation}
              className="run-character"
            />
          </div>
        </div>
        <div className="run-scene-bottom">
          <span>TOQUE PARA PULAR · X PARA ATACAR</span>
          <span>RITMO PROGRESSIVO</span>
        </div>
        <div className="run-controls">
          <button
            type="button"
            className="run-control run-attack-button"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              requestAttack();
            }}
            onClick={(event) => {
              if (event.detail === 0) requestAttack();
            }}
            aria-label="Atacar com a espada"
            data-testid="button-run-attack"
          >
            <Sword size={18} />
            <span>ATACAR</span>
          </button>
          <button
            type="button"
            className="run-control run-jump-button"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              requestJump();
            }}
            onClick={(event) => {
              if (event.detail === 0) requestJump();
            }}
            disabled={!playing}
            aria-label="Pular obstáculo"
            data-testid="button-run-jump"
          >
            <ArrowUp size={21} />
            <span>PULAR</span>
          </button>
        </div>
      </div>
      <p className="run-instruction">
        Toque na pista ou em PULAR para saltar. Use ATACAR para derrotar sentinelas; bônus temporários aparecem pelo caminho.
      </p>
      <span className="sr-only" aria-live="polite">{scene.distance} metros percorridos · fase {scene.phase}</span>
    </section>
  );
}
