import { useEffect, useState } from 'react'

export function useCountUp(target, duration = 1000) {
  const numericTarget = Number(target) || 0
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!Number.isFinite(numericTarget) || numericTarget === 0) {
      setCount(numericTarget)
      return
    }
    let raf = 0
    const start = performance.now()
    const step = (now) => {
      const elapsed = now - start
      const t = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setCount(Math.floor(eased * numericTarget))
      if (t < 1) raf = requestAnimationFrame(step)
      else setCount(numericTarget)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [numericTarget, duration])

  return count
}

export default useCountUp
