import { Suspense } from 'react'
import PayPage from './PayPage'

export default function PayRoute() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    }>
      <PayPage />
    </Suspense>
  )
}
