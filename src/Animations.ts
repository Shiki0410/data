import { gsap } from 'gsap';
import * as echarts from 'echarts';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type InitArgs = {
  root: HTMLDivElement | null;
  horizontalTrack: HTMLDivElement | null;
  counterTarget: HTMLSpanElement | null;
  fieldTunnel?: HTMLElement | null;
  onCounterUpdate: (value: number) => void;
  onSectionChange?: (id: string) => void;
  onProgress?: (progress: number) => void;
};

export function initPageAnimations({
  root,
  horizontalTrack,
  counterTarget,
  fieldTunnel,
  onCounterUpdate,
  onSectionChange,
  onProgress
}: InitArgs) {
  if (!root) return () => undefined;

  const ctx = gsap.context(() => {
    gsap.utils.toArray<HTMLElement>('.reveal-line > span').forEach((el) => {
      gsap.fromTo(
        el,
        { yPercent: 100, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.1,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 92%'
          }
        }
      );
    });

    gsap.utils.toArray<HTMLElement>('.reveal-up').forEach((el) => {
      gsap.fromTo(
        el,
        { y: 44, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%'
          }
        }
      );
    });

    if (fieldTunnel) {
      gsap.fromTo(
        fieldTunnel,
        { '--tunnel-depth': 0.82, '--tunnel-lift': 56 },
        {
          '--tunnel-depth': 1,
          '--tunnel-lift': 0,
          ease: 'none',
          scrollTrigger: {
            trigger: fieldTunnel,
            start: 'top 92%',
            end: 'top 28%',
            scrub: 0.95
          }
        }
      );

      gsap.fromTo(
        '.field-copy',
        { y: 52, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: fieldTunnel,
            start: 'top 78%',
            end: 'top 38%',
            scrub: 0.8
          }
        }
      );

      const onMove = (e: MouseEvent) => {
        const rect = fieldTunnel.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width - 0.5;
        const ny = (e.clientY - rect.top) / rect.height - 0.5;

        const edgeY = Math.max(0, (Math.abs(ny) - 0.22) / 0.28);
        const peakY = Math.min(1, edgeY);
        const shock = Math.pow(peakY, 1.35);

        const tiltX = -ny * (11 + shock * 16);
        const tiltY = nx * (14 + shock * 7.5);
        const panX = nx * (34 + shock * 22);
        const panY = ny * (26 + shock * 54);
        const stretch = 1 + shock * 0.1;

        gsap.to(fieldTunnel, {
          '--tilt-y': `${tiltY.toFixed(2)}deg`,
          '--tilt-x': `${tiltX.toFixed(2)}deg`,
          '--mouse-pan-x': `${panX.toFixed(1)}px`,
          '--mouse-pan-y': `${panY.toFixed(1)}px`,
          '--edge-stretch': stretch.toFixed(3),
          duration: 0.22,
          ease: 'power2.out'
        });
      };

      const onLeave = () => {
        gsap.to(fieldTunnel, {
          '--tilt-y': '0deg',
          '--tilt-x': '0deg',
          '--mouse-pan-x': '0px',
          '--mouse-pan-y': '0px',
          '--edge-stretch': '1',
          duration: 1.1,
          ease: 'elastic.out(1, 0.42)'
        });
      };

      fieldTunnel.addEventListener('mousemove', onMove);
      fieldTunnel.addEventListener('mouseleave', onLeave);

      ScrollTrigger.create({
        trigger: fieldTunnel,
        start: 'top bottom',
        end: 'bottom top',
        onKill: () => {
          fieldTunnel.removeEventListener('mousemove', onMove);
          fieldTunnel.removeEventListener('mouseleave', onLeave);
        }
      });
    }

    if (horizontalTrack) {
      const total = () => Math.max(0, horizontalTrack.scrollWidth - window.innerWidth + 120);
      gsap.to(horizontalTrack, {
        x: () => -total(),
        ease: 'none',
        scrollTrigger: {
          trigger: '#fragments',
          start: 'top top',
          end: () => `+=${total()}`,
          scrub: 0.8,
          pin: true,
          anticipatePin: 1
        }
      });
    }

    if (counterTarget) {
      const target = Number(counterTarget.dataset.target ?? 0);
      const obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '#macro',
          start: 'top 70%',
          end: 'top 20%',
          scrub: 0.6
        },
        onUpdate: () => onCounterUpdate(obj.val)
      });
    }

    gsap.utils.toArray<HTMLElement>('.chart-box').forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        onEnter: () => {
          gsap.fromTo(el, { y: 32, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out' });
          const inst = echarts.getInstanceByDom(el);
          inst?.resize();
        },
        onEnterBack: () => {
          const inst = echarts.getInstanceByDom(el);
          inst?.resize();
        }
      });
    });

    gsap.utils.toArray<HTMLElement>('.atlas-card').forEach((card, i) => {
      ScrollTrigger.create({
        trigger: card,
        start: 'top 82%',
        once: true,
        onEnter: () => {
          card.classList.add('is-fired');
          const revealX = (i % 2 === 0 ? -1 : 1) * (120 + (i % 3) * 40);
          const revealY = (i % 3 === 0 ? -1 : 1) * (20 + (i % 2) * 18);
          gsap.fromTo(
            card,
            { y: 24, opacity: 0.72 },
            { y: 0, opacity: 1, duration: 0.56, delay: i * 0.05, ease: 'power3.out' }
          );
          gsap.set(card, {
            '--card-reveal-x': `${revealX}px`,
            '--card-reveal-y': `${revealY}px`
          });
        }
      });
    });

    gsap.utils.toArray<HTMLElement>('.atlas-line').forEach((line, i) => {
      ScrollTrigger.create({
        trigger: line,
        start: 'top 86%',
        once: true,
        onEnter: () => {
          const mask = line.querySelector<HTMLElement>('.atlas-line-mask');
          if (!mask) return;
          const mode = i % 3;
          const fromX = mode === 0 ? '-100%' : mode === 1 ? '100%' : '0%';
          const fromY = mode === 2 ? '18px' : '0px';
          const slab = line.querySelector<HTMLElement>('.black-slab');
          const targetX = slab?.dataset.revealX ?? '120px';
          const targetY = slab?.dataset.revealY ?? '0px';
          gsap.fromTo(
            mask,
            { x: fromX, y: fromY, opacity: 0 },
            { x: '0%', y: '0px', opacity: 1, duration: 0.84, ease: 'power3.out', delay: 0.08 }
          );
          if (slab) {
            const dir = Number(slab.dataset.dir ?? 1);
            const split = Math.max(18, Math.round(Number(targetX.replace('px', '')) * 0.24));
            gsap.fromTo(
              slab,
              { x: 0, y: 0, clipPath: 'inset(0 0 0 0)' },
              { x: `${Number(targetX.replace('px', '')) * dir}px`, y: targetY, clipPath: 'inset(0 100% 0 0)', duration: 1.08, ease: 'power2.inOut' }
            );
            gsap.to(mask, {
              x: dir * split,
              y: mode === 2 ? -8 : 0,
              duration: 0.42,
              ease: 'power2.out',
              delay: 0.42
            });
          }
        }
      });
    });

    gsap.utils.toArray<HTMLElement>('[data-section-id]').forEach((el) => {
      const sid = el.dataset.sectionId;
      if (!sid) return;
      ScrollTrigger.create({
        trigger: el,
        start: 'top 45%',
        end: 'bottom 45%',
        onEnter: () => onSectionChange?.(sid),
        onEnterBack: () => onSectionChange?.(sid)
      });
    });

    ScrollTrigger.create({
      trigger: document.documentElement,
      start: 0,
      end: 'max',
      onUpdate: (self) => onProgress?.(self.progress)
    });
  }, root);

  return () => {
    ctx.revert();
    ScrollTrigger.getAll().forEach((s) => s.kill());
  };
}

export function setupMagneticElements(selector: string) {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));

  const handlers = nodes.map((node) => {
    const strength = Number(node.dataset.magneticStrength ?? 0.22);

    const onMove = (e: MouseEvent) => {
      const r = node.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      gsap.to(node, {
        x: x * strength,
        y: y * strength,
        duration: 0.4,
        ease: 'power3.out'
      });
    };

    const onLeave = () => {
      gsap.to(node, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    };

    node.addEventListener('mousemove', onMove);
    node.addEventListener('mouseleave', onLeave);

    return { node, onMove, onLeave };
  });

  return () => {
    handlers.forEach(({ node, onMove, onLeave }) => {
      node.removeEventListener('mousemove', onMove);
      node.removeEventListener('mouseleave', onLeave);
    });
  };
}
