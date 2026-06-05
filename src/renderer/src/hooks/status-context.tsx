import { createContext, useContext } from 'react'
import { MisterStatus, emptyStatus } from '@shared/types'
import { useStatus } from './useStatus'

const StatusContext = createContext<MisterStatus>(emptyStatus())

export function StatusProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const status = useStatus()
  return <StatusContext.Provider value={status}>{children}</StatusContext.Provider>
}

export function useStatusContext(): MisterStatus {
  return useContext(StatusContext)
}
