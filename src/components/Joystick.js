import React, { useRef, useEffect } from "react";

export default function Joystick({ onMove = () => {} }) {
  const baseRef = useRef();
  const knobRef = useRef();
  const dragging = useRef(false);
  const center = useRef({ x: 0, y: 0, r: 60 });

  useEffect(() => {
    const base = baseRef.current;
    const knob = knobRef.current;
    const maxRadius = 60;

    const toLocal = (e) => {
      const rect = base.getBoundingClientRect();
      let clientX, clientY;
      if (e.touches && e.touches[0]) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
    };

    const setKnob = (dx, dy) => {
      const dist = Math.hypot(dx, dy);
      let nx = dx, ny = dy;
      if (dist > maxRadius) {
        nx = (dx / dist) * maxRadius;
        ny = (dy / dist) * maxRadius;
      }
      knob.style.transform = `translate(${nx}px, ${ny}px)`;
      const normX = nx / maxRadius;
      const normY = ny / maxRadius;
      onMove({ x: parseFloat(normX.toFixed(3)), y: parseFloat(normY.toFixed(3)) });
    };

    const onStart = (e) => {
      dragging.current = true;
      document.body.style.userSelect = "none";
      const p = toLocal(e);
      setKnob(p.x, p.y);
    };
    const onMove = (e) => {
      if (!dragging.current) return;
      const p = toLocal(e);
      setKnob(p.x, p.y);
    };
    const onEnd = () => {
      dragging.current = false;
      document.body.style.userSelect = "";
      knob.style.transform = `translate(0px,0px)`;
      onMove({ x: 0, y: 0 });
    };

    base.addEventListener("touchstart", onStart, { passive: false });
    base.addEventListener("touchmove", onMove, { passive: false });
    base.addEventListener("touchend", onEnd, { passive: false });
    base.addEventListener("mousedown", onStart);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);

    return () => {
      base.removeEventListener("touchstart", onStart);
      base.removeEventListener("touchmove", onMove);
      base.removeEventListener("touchend", onEnd);
      base.removeEventListener("mousedown", onStart);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
    };
  }, [onMove]);

  return (
    <div className="joystick" ref={baseRef}>
      <div className="joystick-base" />
      <div className="joystick-knob" ref={knobRef} />
    </div>
  );
}

export function JumpButton({ onJump = () => {} }) {
  const pressedRef = useRef(false);

  useEffect(() => {
    return () => { pressedRef.current = false; };
  }, []);

  const onStart = (e) => {
    e.preventDefault();
    if (!pressedRef.current) {
      pressedRef.current = true;
      onJump();
    }
  };
  const onEnd = () => {
    pressedRef.current = false;
  };

  return (
    <div className="jump-button" onTouchStart={onStart} onTouchEnd={onEnd} onMouseDown={onStart} onMouseUp={onEnd}>
      Jump
    </div>
  );
}
