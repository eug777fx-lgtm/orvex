import { useEffect, useState } from 'react'

const BREAKPOINT = 768

export function useIsMobile(breakpoint = BREAKPOINT) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < breakpoint
  })

  useEffect(() => {
    function handler() {
      setIsMobile(window.innerWidth < breakpoint)
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [breakpoint])

  return isMobile
}

export default useIsMobile
