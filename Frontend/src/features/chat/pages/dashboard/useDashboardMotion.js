import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

const MOBILE_BREAKPOINT_QUERY = '(max-width: 44rem)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function getIntroOffset() {
  if (typeof window === 'undefined') {
    return 18
  }

  return window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches ? 12 : 18
}

export function useDashboardMotion({ isSidebarOpen, isThreadView, messageCount }) {
  const scopeRef = useRef(null)

  useEffect(() => {
    if (!scopeRef.current || prefersReducedMotion()) {
      return undefined
    }

    const introOffset = getIntroOffset()
    const context = gsap.context(() => {
      const introTargets = gsap.utils.toArray('[data-dashboard-intro]')

      if (!introTargets.length) {
        return
      }

      gsap.fromTo(
        introTargets,
        {
          autoAlpha: 0,
          y: introOffset,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.08,
          ease: 'power2.out',
          clearProps: 'opacity,transform',
        },
      )
    }, scopeRef)

    return () => context.revert()
  }, [isThreadView])

  useEffect(() => {
    if (!scopeRef.current || prefersReducedMotion()) {
      return undefined
    }

    const context = gsap.context(() => {
      const freshMessages = gsap.utils
        .toArray('.dashboard-message')
        .filter((messageNode) => messageNode.dataset.motionReady !== 'true')

      if (!freshMessages.length) {
        return
      }

      freshMessages.forEach((messageNode) => {
        messageNode.dataset.motionReady = 'true'
      })

      gsap.fromTo(
        freshMessages,
        {
          autoAlpha: 0,
          y: 10,
          scale: 0.985,
        },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.34,
          stagger: 0.05,
          ease: 'power2.out',
          clearProps: 'opacity,transform',
        },
      )
    }, scopeRef)

    return () => context.revert()
  }, [messageCount])

  useEffect(() => {
    if (!scopeRef.current || prefersReducedMotion() || !isSidebarOpen) {
      return undefined
    }

    const context = gsap.context(() => {
      const sidebarItems = gsap.utils.toArray('[data-dashboard-sidebar-item]')

      if (!sidebarItems.length) {
        return
      }

      gsap.fromTo(
        sidebarItems,
        {
          autoAlpha: 0,
          x: -10,
        },
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.28,
          stagger: 0.035,
          ease: 'power2.out',
          clearProps: 'opacity,transform',
        },
      )
    }, scopeRef)

    return () => context.revert()
  }, [isSidebarOpen])

  return scopeRef
}
