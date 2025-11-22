import { useEffect, useState, useCallback, useRef } from 'react';

interface FlyingEmojiData {
  id: string;
  emoji: string;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  fromLeft: boolean;
  offsetX: number;
  offsetY: number;
}

interface FlyingEmojiProps {
  emoji: string;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  fromLeft: boolean;
  offsetX: number;
  offsetY: number;
  onComplete: () => void;
}

// Get start position from left or right side
const getRandomStartPosition = (targetY: number): { x: number; y: number; fromLeft: boolean } => {
  const fromLeft = Math.random() > 0.5;
  const padding = 80;

  // Start from a y position that's somewhat random but will create a nice arc
  const startY = targetY + (Math.random() - 0.5) * 200;

  return {
    x: fromLeft ? -padding : window.innerWidth + padding,
    y: Math.max(50, Math.min(window.innerHeight - 50, startY)),
    fromLeft,
  };
};

// Get random offset for landing position
const getRandomOffset = (): { x: number; y: number } => {
  const radius = 40; // Max offset radius in pixels
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * radius;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
  };
};

// Quadratic bezier curve calculation
const quadraticBezier = (t: number, p0: number, p1: number, p2: number): number => {
  const oneMinusT = 1 - t;
  return oneMinusT * oneMinusT * p0 + 2 * oneMinusT * t * p1 + t * t * p2;
};

type AnimationPhase = 'flying' | 'bounce1' | 'bounce2' | 'done';

const SingleFlyingEmoji = ({ emoji, targetX, targetY, startX, startY, fromLeft, offsetX, offsetY, onComplete }: FlyingEmojiProps) => {
  const [position, setPosition] = useState({ x: startX, y: startY });
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [phase, setPhase] = useState<AnimationPhase>('flying');
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();

  // Apply offset to target
  const finalTargetX = targetX + offsetX;
  const finalTargetY = targetY + offsetY;

  useEffect(() => {
    const flyDuration = 800;
    const bounce1Duration = 250;
    const bounce2Duration = 180;
    const bounceHeight1 = 35;
    const bounceHeight2 = 18;

    // Horizontal bounce distance (in direction of travel)
    const bounceDirection = fromLeft ? 1 : -1; // positive = right, negative = left
    const bounceDistance1 = 25 * bounceDirection;
    const bounceDistance2 = 12 * bounceDirection;

    // Calculate control point for the arc
    const midX = (startX + finalTargetX) / 2;
    const arcHeight = Math.min(200, Math.abs(finalTargetX - startX) * 0.3);
    const controlY = Math.min(startY, finalTargetY) - arcHeight;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;

      if (phase === 'flying') {
        const progress = Math.min(elapsed / flyDuration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        const x = quadraticBezier(eased, startX, midX, finalTargetX);
        const y = quadraticBezier(eased, startY, controlY, finalTargetY);
        const rotationAmount = fromLeft ? progress * 360 : -progress * 360;
        const currentScale = 1 + eased * 0.3;

        setPosition({ x, y });
        setRotation(rotationAmount);
        setScale(currentScale);

        if (progress >= 1) {
          setPhase('bounce1');
          startTimeRef.current = timestamp;
        }
      } else if (phase === 'bounce1') {
        const bounceElapsed = elapsed;
        const progress = Math.min(bounceElapsed / bounce1Duration, 1);

        // Bounce up then down using sine curve
        const bounceY = Math.sin(progress * Math.PI) * bounceHeight1;

        // Move horizontally in direction of travel (ease-out)
        const horizontalProgress = 1 - Math.pow(1 - progress, 2);
        const currentX = finalTargetX + bounceDistance1 * horizontalProgress;

        setPosition({ x: currentX, y: finalTargetY - bounceY });

        // Squash and stretch effect
        if (progress < 0.1) {
          setScale(1.3 * (1 - progress * 2)); // Squash on impact
        } else {
          setScale(1.2);
        }

        // Small rotation during bounce
        const bounceRotation = fromLeft ? 360 + progress * 45 : -360 - progress * 45;
        setRotation(bounceRotation);

        if (progress >= 1) {
          setPhase('bounce2');
          startTimeRef.current = timestamp;
        }
      } else if (phase === 'bounce2') {
        const bounceElapsed = elapsed;
        const progress = Math.min(bounceElapsed / bounce2Duration, 1);

        // Smaller second bounce
        const bounceY = Math.sin(progress * Math.PI) * bounceHeight2;

        // Continue moving horizontally but slower
        const horizontalProgress = 1 - Math.pow(1 - progress, 2);
        const startX2 = finalTargetX + bounceDistance1;
        const currentX = startX2 + bounceDistance2 * horizontalProgress;

        setPosition({ x: currentX, y: finalTargetY - bounceY });

        // Squash effect on second landing
        if (progress < 0.15) {
          setScale(1.2 * (1 - progress));
        } else {
          setScale(1.1);
        }

        // Continue small rotation
        const bounceRotation = fromLeft ? 405 + progress * 20 : -405 - progress * 20;
        setRotation(bounceRotation);

        if (progress >= 1) {
          setPhase('done');
          // Wait a moment then remove
          setTimeout(() => {
            onComplete();
          }, 400);
        }
      }

      if (phase !== 'done') {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [startX, startY, finalTargetX, finalTargetY, fromLeft, onComplete, phase]);

  return (
    <div
      className="fixed pointer-events-none z-[100] text-5xl"
      style={{
        left: position.x,
        top: position.y,
        transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`,
        opacity: phase === 'done' ? 0.8 : 1,
        transition: phase === 'done' ? 'opacity 0.3s' : undefined,
      }}
    >
      <span>{emoji}</span>
    </div>
  );
};

interface FlyingEmojiContainerProps {
  emojis: FlyingEmojiData[];
  onRemoveEmoji: (id: string) => void;
}

const FlyingEmojiContainer = ({ emojis, onRemoveEmoji }: FlyingEmojiContainerProps) => {
  return (
    <>
      {emojis.map((emojiData) => (
        <SingleFlyingEmoji
          key={emojiData.id}
          emoji={emojiData.emoji}
          targetX={emojiData.targetX}
          targetY={emojiData.targetY}
          startX={emojiData.startX}
          startY={emojiData.startY}
          fromLeft={emojiData.fromLeft}
          offsetX={emojiData.offsetX}
          offsetY={emojiData.offsetY}
          onComplete={() => onRemoveEmoji(emojiData.id)}
        />
      ))}
    </>
  );
};

// Custom hook for managing flying emojis
export const useFlyingEmojis = () => {
  const [emojis, setEmojis] = useState<FlyingEmojiData[]>([]);

  const addEmoji = useCallback((emoji: string, targetX: number, targetY: number) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startPos = getRandomStartPosition(targetY);
    const offset = getRandomOffset();

    setEmojis(prev => [...prev, {
      id,
      emoji,
      targetX,
      targetY,
      startX: startPos.x,
      startY: startPos.y,
      fromLeft: startPos.fromLeft,
      offsetX: offset.x,
      offsetY: offset.y,
    }]);
  }, []);

  const removeEmoji = useCallback((id: string) => {
    setEmojis(prev => prev.filter(e => e.id !== id));
  }, []);

  return { emojis, addEmoji, removeEmoji };
};

export default FlyingEmojiContainer;
