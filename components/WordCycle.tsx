'use client'

// Η εναλλασσόμενη λέξη του τίτλου (Claude Design handoff «Word animation
// loop», 29/8/26): τέσσερα στυλ μετάβασης σε κύκλο — mask slide, letter
// flip, blur dissolve, scramble. Πιστή μεταφορά του vanilla script σε
// React: το effect κατέχει το DOM του slot (δημιουργεί/σκοτώνει spans),
// ο React αποδίδει μόνο την αρχική λέξη και δεν ξαναγγίζει το υποδέντρο.
// Τα στυλ ζουν στο globals.css (.cforc-cycle__*)· σέβεται
// prefers-reduced-motion και .accessibility-pause-animations.

import { useEffect, useRef } from 'react'

const POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#*/%'
const STYLES = ['mask', 'flip', 'blur', 'scramble'] as const

export default function WordCycle({
  words,
  hold = 1800,
  dur = 700,
}: {
  words: string[]
  hold?: number
  dur?: number
}) {
  const slotRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const slot = slotRef.current
    if (!slot || words.length < 2) return
    let live = slot.querySelector<HTMLSpanElement>('.cforc-cycle__word')
    if (!live) return

    // Ξεκινά από την τελευταία λέξη — η πρώτη αλλαγή πάει στην words[0]
    let i = words.length - 1
    let step = 0
    let raf = 0
    live.textContent = words[i]

    // Κλείδωμα στο πλάτος της φαρδύτερης λέξης: η γραμμή δεν ανασαλεύει ποτέ
    const probe = document.createElement('span')
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap'
    slot.appendChild(probe)
    let widest = 0
    words.forEach(w => { probe.textContent = w; widest = Math.max(widest, probe.offsetWidth) })
    slot.removeChild(probe)
    slot.style.minWidth = `${widest}px`

    const setWord = (el: HTMLElement, text: string) => {
      el.textContent = ''
      el.appendChild(document.createTextNode(text))
    }

    const splitLetters = (el: HTMLElement, text: string) => {
      el.textContent = ''
      for (const ch of text) {
        const s = document.createElement('span')
        s.textContent = ch
        el.appendChild(s)
      }
    }

    function transition() {
      if (!slot || !live) return
      const next = words[(i + 1) % words.length]
      const style = STYLES[step % STYLES.length]
      i = (i + 1) % words.length
      step++
      cancelAnimationFrame(raf)
      slot.classList.toggle('cforc-cycle__slot--open', style === 'blur' || style === 'flip')

      if (style === 'mask' || style === 'blur') {
        const out = live
        out.classList.add('cforc-cycle__word--out')
        out.style.animation = `cforc-${style === 'mask' ? 'maskOut' : 'blurOut'} ${dur}ms ${
          style === 'mask' ? 'cubic-bezier(.22,1,.36,1)' : 'ease-in'} both`

        const inEl = document.createElement('span')
        inEl.className = 'cforc-cycle__word'
        setWord(inEl, next)
        inEl.style.animation = `cforc-${style === 'mask' ? 'maskIn' : 'blurIn'} ${dur}ms ${
          style === 'mask' ? 'cubic-bezier(.22,1,.36,1)' : 'ease-out'} both`
        slot.appendChild(inEl)
        live = inEl
        setTimeout(() => { out.parentNode?.removeChild(out) }, dur + 40)

      } else if (style === 'flip') {
        splitLetters(live, next)
        Array.prototype.forEach.call(live.children, (s: HTMLElement, n: number) => {
          s.style.animation = `cforc-flipIn ${Math.round(dur * 0.8)}ms cubic-bezier(.34,1.56,.64,1) both`
          s.style.animationDelay = `${n * 45}ms`
        })

      } else { // scramble
        const t0 = performance.now()
        const target = next.toUpperCase()
        const caret = '▪'
        const frame = (t: number) => {
          if (!live) return
          const p = Math.min(1, (t - t0) / dur)
          const shown = Math.floor(p * target.length)
          let s = target.slice(0, shown)
          for (let k = shown; k < target.length; k++) s += POOL[Math.floor(Math.random() * POOL.length)]
          setWord(live, p < 1 ? s + caret : next)
          if (p < 1) raf = requestAnimationFrame(frame)
        }
        raf = requestAnimationFrame(frame)
      }
    }

    const timer = setInterval(transition, hold + dur)
    return () => {
      clearInterval(timer)
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words.join(','), hold, dur])

  return (
    <span ref={slotRef} className="cforc-cycle__slot">
      <span className="cforc-cycle__word">{words[words.length - 1]}</span>
    </span>
  )
}
