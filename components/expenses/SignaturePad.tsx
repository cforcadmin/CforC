'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Υπογραφή με ποντίκι ή δάχτυλο.
 *
 * Δεν είναι αυτή που αποδεικνύει ποιος υπέγραψε — αυτό το κάνει η συνεδρία
 * του μέλους, που καταγράφεται στην υποβολή. Είναι το οπτικό αποτύπωμα που
 * περιμένει το μάτι σε ένα εξοδολόγιο, και μπαίνει αυτούσιο στο PDF.
 */
export default function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasInk, setHasInk] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Οθόνες Retina: ζωγραφίζουμε σε διπλή ανάλυση για να μη «σπάει» η γραμμή
    const ratio = Math.min(window.devicePixelRatio || 1, 3)
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#2D2D2D'
  }, [])

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    drawing.current = true
    const { x, y } = pos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    if (!hasInk) setHasInk(true)
  }

  function end() {
    if (!drawing.current) return
    drawing.current = false
    const canvas = canvasRef.current
    if (canvas && hasInk) onChange(canvas.toDataURL('image/png'))
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
    onChange(null)
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="w-full h-40 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-100 touch-none cursor-crosshair"
        aria-label="Περιοχή υπογραφής — σχεδίασε με το ποντίκι ή το δάχτυλο"
      />
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-gray-600 dark:text-gray-300">
          {hasInk ? 'Η υπογραφή καταγράφηκε.' : 'Προαιρετικό — σχεδίασε την υπογραφή σου.'}
        </p>
        <button type="button" onClick={clear}
          className="text-xs font-bold text-coral dark:text-coral-light hover:underline">
          Καθάρισμα
        </button>
      </div>
    </div>
  )
}
