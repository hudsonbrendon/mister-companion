import { useEffect, useState } from 'react'
import { api } from '../api'
import { MisterStatus, emptyStatus } from '@shared/types'

export function useStatus(): MisterStatus {
  const [status, setStatus] = useState<MisterStatus>(emptyStatus())
  useEffect(() => {
    const unsub = api.onStatusUpdate(setStatus)
    api.startStatusFeed()
    return unsub
  }, [])
  return status
}
