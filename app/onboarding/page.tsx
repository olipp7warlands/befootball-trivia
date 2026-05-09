import { Suspense } from 'react'
import { ScreenContainer } from '@/components/layout/ScreenContainer'
import { OnboardingForm } from './OnboardingForm'

export default function OnboardingPage() {
  return (
    <ScreenContainer>
      <Suspense
        fallback={
          <div
            style={{
              minHeight: '100dvh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'rgba(222,216,250,0.4)',
              }}
            >
              Cargando...
            </span>
          </div>
        }
      >
        <OnboardingForm />
      </Suspense>
    </ScreenContainer>
  )
}
