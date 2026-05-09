import { Suspense } from 'react'
import { OnboardingForm } from './OnboardingForm'

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-dvh items-center justify-center"
          style={{ background: '#0a0420' }}
        >
          <span className="text-white/40 text-sm">Cargando...</span>
        </div>
      }
    >
      <OnboardingForm />
    </Suspense>
  )
}
