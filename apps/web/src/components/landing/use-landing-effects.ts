'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

type RevealClasses = {
  sectionActive: string;
  staggerVisible: string;
};

export function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const [bgGradient, setBgGradient] = useState(
    'linear-gradient(135deg, rgba(225, 48, 108, 0.05), transparent)',
  );

  useEffect(() => {
    const onScroll = () => {
      const winScroll = document.documentElement.scrollTop;
      const height =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setProgress(height > 0 ? (winScroll / height) * 100 : 0);

      const ratio = winScroll / Math.max(document.documentElement.scrollHeight, 1);
      if (ratio < 0.2) {
        setBgGradient('linear-gradient(135deg, rgba(225, 48, 108, 0.05), transparent)');
      } else if (ratio < 0.5) {
        setBgGradient('linear-gradient(135deg, rgba(24, 119, 242, 0.05), transparent)');
      } else {
        setBgGradient('linear-gradient(135deg, rgba(37, 211, 102, 0.05), transparent)');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return { progress, bgGradient };
}

function useTiltOnRoot(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const cleanups: Array<() => void> = [];

    root.querySelectorAll<HTMLElement>('[data-tilt-container]').forEach((parent) => {
      const card = parent.querySelector<HTMLElement>('[data-tilt-card]');
      if (!card) return;

      const onMove = (e: MouseEvent) => {
        const rect = parent.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rotateX = (y - rect.height / 2) / 20;
        const rotateY = (rect.width / 2 - x) / 20;
        card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
      };
      const onLeave = () => {
        card.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
      };

      parent.addEventListener('mousemove', onMove);
      parent.addEventListener('mouseleave', onLeave);
      cleanups.push(() => {
        parent.removeEventListener('mousemove', onMove);
        parent.removeEventListener('mouseleave', onLeave);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, [rootRef]);
}

function useMagneticOnRoot(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const cleanups: Array<() => void> = [];

    root.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((btn) => {
      const onMove = (e: MouseEvent) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px) scale(1.05)`;
      };
      const onLeave = () => {
        btn.style.transform = 'translate(0, 0) scale(1)';
      };
      btn.addEventListener('mousemove', onMove);
      btn.addEventListener('mouseleave', onLeave);
      cleanups.push(() => {
        btn.removeEventListener('mousemove', onMove);
        btn.removeEventListener('mouseleave', onLeave);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, [rootRef]);
}

function useScrollRevealOnRoot(
  rootRef: RefObject<HTMLElement | null>,
  classes: RevealClasses,
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          el.classList.add(classes.sectionActive);

          el.querySelectorAll<HTMLElement>('[data-stagger]').forEach((item, index) => {
            item.style.transitionDelay = `${index * 0.2}s`;
            item.classList.add(classes.staggerVisible);
          });
        });
      },
      { threshold: 0.1 },
    );

    root.querySelectorAll('[data-scroll-reveal]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [rootRef, classes.sectionActive, classes.staggerVisible]);
}

export function useParallax() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setOffset({
        x: (window.innerWidth / 2 - e.clientX) / 50,
        y: (window.innerHeight / 2 - e.clientY) / 50,
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return offset;
}

export function useLandingInteractions(revealClasses: RevealClasses) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { progress, bgGradient } = useScrollProgress();
  const parallax = useParallax();
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setHeroVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useTiltOnRoot(rootRef);
  useMagneticOnRoot(rootRef);
  useScrollRevealOnRoot(rootRef, revealClasses);

  return { rootRef, progress, bgGradient, parallax, heroVisible };
}
