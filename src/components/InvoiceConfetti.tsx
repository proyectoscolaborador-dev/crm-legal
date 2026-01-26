import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface InvoiceConfettiProps {
  trigger: boolean;
}

export function InvoiceConfetti({ trigger }: InvoiceConfettiProps) {
  useEffect(() => {
    if (!trigger) return;

    // Fire confetti from both sides
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Confetti from left
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#10b981', '#22c55e', '#4ade80', '#86efac', '#fbbf24', '#f59e0b'],
      });

      // Confetti from right
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#10b981', '#22c55e', '#4ade80', '#86efac', '#fbbf24', '#f59e0b'],
      });
    }, 250);

    // Also fire a big burst in the center
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#10b981', '#22c55e', '#4ade80', '#86efac', '#fbbf24', '#f59e0b', '#ffffff'],
      zIndex: 9999,
    });

    return () => clearInterval(interval);
  }, [trigger]);

  return null;
}
