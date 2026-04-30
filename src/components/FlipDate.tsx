"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  text: string;
  direction?: "up" | "down";
  className?: string;
}

interface CharSlot {
  key: number;
  prevChar: string;
  nextChar: string;
  animating: boolean;
  direction: "up" | "down";
}

const FLIP_DURATION = 380;

export default function FlipDate({ text, direction = "up", className }: Props) {
  const keyCounterRef = useRef<number>(0);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const [slots, setSlots] = useState<CharSlot[]>(() => {
    const arr = Array.from(text);
    return arr.map((ch) => ({
      key: keyCounterRef.current++,
      prevChar: ch,
      nextChar: ch,
      animating: false,
      direction: "up",
    }));
  });
  const prevTextRef = useRef<string>(text);

  useEffect(() => {
    if (text === prevTextRef.current) return;
    const nextArr = Array.from(text);
    const prevArr = Array.from(prevTextRef.current);
    prevTextRef.current = text;

    setSlots((current) => {
      const result: CharSlot[] = [];
      const maxLen = Math.max(nextArr.length, current.length);
      for (let i = 0; i < maxLen; i++) {
        const newChar = nextArr[i];
        if (newChar === undefined) continue;
        const oldSlot = current[i];
        const oldChar = prevArr[i];
        if (!oldSlot) {
          result.push({
            key: keyCounterRef.current++,
            prevChar: newChar,
            nextChar: newChar,
            animating: false,
            direction,
          });
          continue;
        }
        if (oldChar === newChar && !oldSlot.animating) {
          result.push(oldSlot);
          continue;
        }
        const existing = timersRef.current.get(oldSlot.key);
        if (existing) clearTimeout(existing);
        result.push({
          key: oldSlot.key,
          prevChar: oldSlot.nextChar,
          nextChar: newChar,
          animating: true,
          direction,
        });
      }
      return result;
    });
  }, [text, direction]);

  useEffect(() => {
    slots.forEach((slot) => {
      if (!slot.animating) return;
      if (timersRef.current.has(slot.key)) return;
      const timer = setTimeout(() => {
        timersRef.current.delete(slot.key);
        setSlots((prev) =>
          prev.map((s) =>
            s.key === slot.key
              ? { ...s, prevChar: s.nextChar, animating: false }
              : s,
          ),
        );
      }, FLIP_DURATION);
      timersRef.current.set(slot.key, timer);
    });
  }, [slots]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  return (
    <span className={className}>
      {slots.map((slot) => {
        if (!slot.animating) {
          return (
            <span key={slot.key} className="flip-char-static">
              {slot.nextChar === " " ? "\u00a0" : slot.nextChar}
            </span>
          );
        }
        const dirClass =
          slot.direction === "down" ? "flip-char-down" : "flip-char-up";
        return (
          <span key={slot.key} className={`flip-char ${dirClass}`}>
            <span className="flip-char-old" aria-hidden="true">
              {slot.prevChar === " " ? "\u00a0" : slot.prevChar}
            </span>
            <span className="flip-char-new">
              {slot.nextChar === " " ? "\u00a0" : slot.nextChar}
            </span>
          </span>
        );
      })}
    </span>
  );
}
