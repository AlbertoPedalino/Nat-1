import { useEffect, useRef } from 'react';

const LASER_BROADCAST_MS = 50;

// The laser: live as soon as the tool is in hand, drawn here every frame from a
// ref and broadcast to the table at a throttled rate.
export function useLaserPointer({ paintMode, onLaser }) {
  const lastLaserRef = useRef(0);
  const laserPointRef = useRef(null);
  const laserSelectedRef = useRef(false);

  // A stationary pointer is still pointing. Refresh the broadcast while the
  // laser remains selected so its safety TTL only removes abandoned dots, not
  // a dot deliberately held over one square. Switching tools clears it at once.
  useEffect(() => {
    if (paintMode !== 'laser') {
      if (laserSelectedRef.current) onLaser?.(null);
      laserSelectedRef.current = false;
      laserPointRef.current = null;
      return undefined;
    }

    laserSelectedRef.current = true;
    const timer = setInterval(() => {
      if (laserPointRef.current) onLaser?.(laserPointRef.current);
    }, 1000);
    return () => clearInterval(timer);
  }, [onLaser, paintMode]);

  // A click merely moves the dot.
  const pointAt = (at) => {
    laserPointRef.current = at;
    onLaser?.(at);
  };

  const follow = (at) => {
    // Local rendering reads this ref on the next animation frame. Broadcasting
    // stays throttled, but no longer limits what the person pointing sees.
    laserPointRef.current = at;
    const now = Date.now();
    if (now - lastLaserRef.current >= LASER_BROADCAST_MS) {
      lastLaserRef.current = now;
      onLaser?.(at);
    }
  };

  const leave = () => {
    laserPointRef.current = null;
    onLaser?.(null);
  };

  return {
    laserPointRef, pointAt, follow, leave,
  };
}
