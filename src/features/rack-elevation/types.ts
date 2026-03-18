export type RackDevice = {
  id: string
  model: string
  role: 'leaf' | 'spine' | 'oob' | 'border' | 'server' | 'fc-switch' | 'access' | 'aggregation' | 'core'
  label: string
  uSlot: number
  uHeight: number
  usedPorts: number
  totalPorts: number
}
