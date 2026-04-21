import { useEffect, useState } from 'react'

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < breakpoint
  })

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < breakpoint)
    }
    window.addEventListener('resize', check)
    check()
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])

  return isMobile
}

export default useIsMobile
