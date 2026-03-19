import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/shallow'
import { useInputStore } from '@/store/inputStore'
import { SWITCH_CATALOG } from '@/domain/catalog/hardware'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const LEAF_MODELS = ['S5248F-ON', 'S5224F-ON', 'S5212F-ON', 'S5296F-ON'] as const
const SPINE_MODELS = ['S5232F-ON'] as const
const ACCESS_MODELS = ['S5248F-ON', 'S5224F-ON', 'S5212F-ON', 'S5296F-ON', 'Z9264F-ON'] as const
const AGGREGATION_MODELS = ['Z9264F-ON', 'Z9332F-ON', 'Z9432F-ON', 'S5232F-ON'] as const
const CORE_MODELS = ['Z9332F-ON', 'Z9432F-ON'] as const
const BORDER_LEAF_OPTIONS = ['none', 'S5248F-ON', 'S5224F-ON', 'S5212F-ON', 'S5296F-ON'] as const
const RACK_SIZES = ['24U', '42U', '50U'] as const
const SERVER_U_HEIGHTS = ['1U', '2U', '4U', '8U'] as const

const U_HEIGHT_LABELS: Record<string, string> = {
  '1U': 'sizing.uHeight1U',
  '2U': 'sizing.uHeight2U',
  '4U': 'sizing.uHeight4U',
  '8U': 'sizing.uHeight8U',
}

interface FormValues {
  topology: 'leaf-spine' | 'three-tier'
  rackCount: number
  rackServers: number[]
  portsPerServerFrontend: number
  portsPerServerBackend: number
  activeUplinksPerLeaf: number
  connectivityType: '25G' | '100G'
  cableType: 'DAC' | 'AOC' | 'fiber'
  leafModel: 'S5248F-ON' | 'S5224F-ON' | 'S5212F-ON' | 'S5296F-ON'
  spineModel: 'S5232F-ON'
  // Three-tier fields
  accessModel: 'S5248F-ON' | 'S5224F-ON' | 'S5212F-ON' | 'S5296F-ON' | 'Z9264F-ON'
  activeUplinksPerAccess: number
  aggregationModel: 'Z9264F-ON' | 'Z9332F-ON' | 'Z9432F-ON' | 'S5232F-ON'
  activeUplinksPerAggregation: number
  coreModel: 'Z9332F-ON' | 'Z9432F-ON'
  // Brownfield toggles
  existingSpinesDeployed: boolean
  existingCoreDeployed: boolean
  // Shared
  borderLeafModel: 'S5248F-ON' | 'S5224F-ON' | 'S5212F-ON' | 'S5296F-ON' | 'none'
  borderLeafCount: number
  rackSize: '24U' | '42U' | '50U'
  serverUHeight: '1U' | '2U' | '4U' | '8U'
  switchPositioning: 'ToR' | 'MoR' | 'BoR'
}

export function InputForm() {
  const { t } = useTranslation()
  const { input, setInput, resetInput } = useInputStore(
    useShallow((s) => ({ input: s.input, setInput: s.setInput, resetInput: s.resetInput }))
  )

  // CRITICAL: Do NOT pass generic type argument to useForm with Zod v4
  const form = useForm<FormValues>({
    defaultValues: {
      topology: input.topology,
      rackCount: input.racks.length,
      rackServers: input.racks.map((r) => r.serverCount),
      portsPerServerFrontend: input.portsPerServerFrontend,
      portsPerServerBackend: input.portsPerServerBackend,
      activeUplinksPerLeaf: input.activeUplinksPerLeaf,
      connectivityType: input.connectivityType,
      cableType: input.cableType,
      leafModel: input.leafModel,
      spineModel: input.spineModel,
      accessModel: input.accessModel,
      activeUplinksPerAccess: input.activeUplinksPerAccess,
      aggregationModel: input.aggregationModel,
      activeUplinksPerAggregation: input.activeUplinksPerAggregation,
      coreModel: input.coreModel,
      existingSpinesDeployed: input.existingSpinesDeployed,
      existingCoreDeployed: input.existingCoreDeployed,
      borderLeafModel: input.borderLeafModel,
      borderLeafCount: input.borderLeafCount,
      rackSize: input.rackSize,
      serverUHeight: input.serverUHeight,
      switchPositioning: input.switchPositioning,
    },
    mode: 'onChange',
  })

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Watch topology to conditionally render fields
  const currentTopology = form.watch('topology')

  // Watch leafModel to derive max uplinks and clamp activeUplinksPerLeaf
  const currentLeafModel = form.watch('leafModel')
  const maxUplinks = SWITCH_CATALOG[currentLeafModel]?.uplinkPorts ?? 4

  useEffect(() => {
    const currentUplinks = form.getValues('activeUplinksPerLeaf')
    if (currentUplinks > maxUplinks) {
      form.setValue('activeUplinksPerLeaf', maxUplinks)
      setInput({ activeUplinksPerLeaf: maxUplinks })
    }
  }, [currentLeafModel, maxUplinks, form, setInput])

  useEffect(() => {
    const subscription = form.watch((values, { name }) => {
      const v = values as Partial<FormValues>

      if (name === 'rackCount') {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          const newCount = Math.max(1, Math.min(200, Number(v.rackCount ?? 1)))
          const currentServers = form.getValues('rackServers') ?? []
          let newServers: number[]
          if (newCount > currentServers.length) {
            newServers = [
              ...currentServers,
              ...Array(newCount - currentServers.length).fill(16),
            ]
          } else {
            newServers = currentServers.slice(0, newCount)
          }
          form.setValue('rackServers', newServers)
          setInput({ racks: newServers.map((serverCount) => ({ serverCount })) })
        }, 150)
        return
      }

      if (name?.startsWith('rackServers.')) {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          const servers = form.getValues('rackServers') ?? []
          setInput({ racks: servers.map((serverCount) => ({ serverCount: Number(serverCount) || 0 })) })
        }, 150)
        return
      }

      if (
        name === 'portsPerServerFrontend' ||
        name === 'portsPerServerBackend' ||
        name === 'activeUplinksPerLeaf' ||
        name === 'activeUplinksPerAccess' ||
        name === 'activeUplinksPerAggregation'
      ) {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          const numVal = Number(v[name as keyof FormValues])
          if (!isNaN(numVal)) {
            setInput({ [name]: numVal })
          }
        }, 150)
        return
      }

      // Select inputs: immediate update
      const {
        rackCount: _rc, rackServers: _rs,
        portsPerServerFrontend: _pf, portsPerServerBackend: _pb,
        activeUplinksPerLeaf: _au, activeUplinksPerAccess: _ua,
        activeUplinksPerAggregation: _uag,
        ...rest
      } = v as FormValues
      const validRest = Object.fromEntries(
        Object.entries(rest).filter(([, val]) => val !== undefined && val !== null && String(val) !== '')
      )
      if (Object.keys(validRest).length > 0) {
        setInput(validRest)
      }
    })

    return () => {
      subscription.unsubscribe()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [form, setInput])

  const watchedRackServers = form.watch('rackServers') ?? []
  const totalServers = watchedRackServers.reduce((sum, c) => sum + (Number(c) || 0), 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          {t('sizing.heading')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6">

            {/* === Topology Selector === */}
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="topology"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('mode.topologyLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="leaf-spine">{t('mode.topologyClos')}</SelectItem>
                        <SelectItem value="three-tier">{t('mode.topologyThreeTier')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* === Rack Configuration === */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {t('sizing.rackConfigHeading')}
              </h3>

              {/* Rack Count */}
              <FormField
                control={form.control}
                name="rackCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sizing.rackCount')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={200}
                        data-testid="rack-count"
                        {...field}
                        onChange={(e) => {
                          const val = e.target.value
                          field.onChange(val === '' ? '' : Number(val))
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Per-rack server count inputs */}
              <div className={watchedRackServers.length > 4 ? 'max-h-48 overflow-y-auto space-y-2' : 'space-y-2'}>
                {watchedRackServers.map((_, i) => (
                  <FormField
                    key={i}
                    control={form.control}
                    name={`rackServers.${i}` as `rackServers.${number}`}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormLabel className="w-16 shrink-0 text-xs">
                            {t('sizing.rackLabel', { n: i + 1 })}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={500}
                              data-testid={`rack-server-${i}`}
                              {...field}
                              onChange={(e) => {
                                const val = e.target.value
                                field.onChange(val === '' ? '' : Number(val))
                              }}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>

              {/* Total server count summary */}
              <p className="text-xs text-muted-foreground">
                {t('sizing.totalServersDisplay', { count: totalServers })}
              </p>
            </div>

            {/* === Server Connectivity === */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {t('sizing.serverConnectivityHeading')}
              </h3>

              {/* Frontend Ports per Server */}
              <FormField
                control={form.control}
                name="portsPerServerFrontend"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sizing.portsPerServerFrontend')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={8}
                        data-testid="ports-frontend"
                        {...field}
                        onChange={(e) => {
                          const val = e.target.value
                          field.onChange(val === '' ? '' : Number(val))
                        }}
                      />
                    </FormControl>
                    <FormDescription>{t('sizing.frontendPortsHelp')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Backend Ports per Server */}
              <FormField
                control={form.control}
                name="portsPerServerBackend"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sizing.portsPerServerBackend')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={8}
                        data-testid="ports-backend"
                        {...field}
                        onChange={(e) => {
                          const val = e.target.value
                          field.onChange(val === '' ? '' : Number(val))
                        }}
                      />
                    </FormControl>
                    <FormDescription>{t('sizing.backendPortsHelp')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* === Network Configuration === */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {t('sizing.networkConfigHeading')}
              </h3>

              {/* Connectivity Type */}
              <FormField
                control={form.control}
                name="connectivityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sizing.connectivityType')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('sizing.selectConnectivity')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="25G">{t('sizing.connectivity25G')}</SelectItem>
                        <SelectItem value="100G">{t('sizing.connectivity100G')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cable Type */}
              <FormField
                control={form.control}
                name="cableType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sizing.cableType')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('sizing.selectCable')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DAC">{t('sizing.cableDAC')}</SelectItem>
                        <SelectItem value="AOC">{t('sizing.cableAOC')}</SelectItem>
                        <SelectItem value="fiber">{t('sizing.cableFiber')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* === Clos-specific fields (leaf-spine topology) === */}
              {currentTopology === 'leaf-spine' && (
                <>
                  {/* Leaf Switch Model */}
                  <FormField
                    control={form.control}
                    name="leafModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('sizing.leafModel')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('sizing.selectLeafModel')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LEAF_MODELS.map((model) => (
                              <SelectItem key={model} value={model}>{model}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Active Uplinks per Leaf */}
                  <FormField
                    control={form.control}
                    name="activeUplinksPerLeaf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('sizing.activeUplinksPerLeaf')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={maxUplinks}
                            data-testid="active-uplinks"
                            {...field}
                            onChange={(e) => {
                              const val = e.target.value
                              field.onChange(val === '' ? '' : Number(val))
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          {t('sizing.activeUplinksHelp', { max: maxUplinks, model: currentLeafModel })}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Spine Switch Model */}
                  <FormField
                    control={form.control}
                    name="spineModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('sizing.spineModel')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('sizing.selectSpineModel')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SPINE_MODELS.map((model) => (
                              <SelectItem key={model} value={model}>{model}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Existing Spines Toggle */}
                  <FormField
                    control={form.control}
                    name="existingSpinesDeployed"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                            data-testid="existing-spines-toggle"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">{t('infra.existingSpinesToggle')}</FormLabel>
                          <FormDescription>{t('infra.existingSpinesHelp')}</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* === Three-Tier-specific fields === */}
              {currentTopology === 'three-tier' && (
                <>
                  {/* Access Switch Model */}
                  <FormField
                    control={form.control}
                    name="accessModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('threeTier.accessModel')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ACCESS_MODELS.map((model) => (
                              <SelectItem key={model} value={model}>{model}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Active Uplinks per Access */}
                  <FormField
                    control={form.control}
                    name="activeUplinksPerAccess"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('threeTier.activeUplinksPerAccess')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={64}
                            data-testid="tt-uplinks-access"
                            {...field}
                            onChange={(e) => {
                              const val = e.target.value
                              field.onChange(val === '' ? '' : Number(val))
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Aggregation Switch Model */}
                  <FormField
                    control={form.control}
                    name="aggregationModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('threeTier.aggregationModel')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {AGGREGATION_MODELS.map((model) => (
                              <SelectItem key={model} value={model}>{model}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Active Uplinks per Aggregation */}
                  <FormField
                    control={form.control}
                    name="activeUplinksPerAggregation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('threeTier.activeUplinksPerAggregation')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={32}
                            data-testid="tt-uplinks-aggr"
                            {...field}
                            onChange={(e) => {
                              const val = e.target.value
                              field.onChange(val === '' ? '' : Number(val))
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Core Switch Model */}
                  <FormField
                    control={form.control}
                    name="coreModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('threeTier.coreModel')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CORE_MODELS.map((model) => (
                              <SelectItem key={model} value={model}>{model}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Existing Core Toggle */}
                  <FormField
                    control={form.control}
                    name="existingCoreDeployed"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                            data-testid="existing-core-toggle"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">{t('infra.existingCoreToggle')}</FormLabel>
                          <FormDescription>{t('infra.existingCoreHelp')}</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>

            {/* === Border Leaf === */}
            <div className="space-y-3">
              {/* Border Leaf Model */}
              <FormField
                control={form.control}
                name="borderLeafModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sizing.borderLeafModel')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('sizing.selectBorderLeaf')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BORDER_LEAF_OPTIONS.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model === 'none' ? t('sizing.borderLeafNone') : model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Border Leaf Count (only if border model selected) */}
              {form.watch('borderLeafModel') !== 'none' && (
                <FormField
                  control={form.control}
                  name="borderLeafCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('sizing.borderLeafCount')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={4}
                          {...field}
                          onChange={(e) => {
                            const val = e.target.value
                            field.onChange(val === '' ? '' : Number(val))
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* === Physical === */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {t('sizing.physicalHeading')}
              </h3>

              {/* Rack Size */}
              <FormField
                control={form.control}
                name="rackSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sizing.rackSize')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('sizing.selectRackSize')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RACK_SIZES.map((size) => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Server U-Height */}
              <FormField
                control={form.control}
                name="serverUHeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sizing.serverUHeight')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('sizing.selectServerUHeight')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SERVER_U_HEIGHTS.map((size) => (
                          <SelectItem key={size} value={size}>{t(U_HEIGHT_LABELS[size])}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Switch Positioning */}
              <FormField
                control={form.control}
                name="switchPositioning"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sizing.switchPositioning')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('sizing.selectSwitchPositioning')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ToR">{t('sizing.positionToR')}</SelectItem>
                        <SelectItem value="MoR">{t('sizing.positionMoR')}</SelectItem>
                        <SelectItem value="BoR">{t('sizing.positionBoR')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>{t('sizing.positioningHelp')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Reset button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => {
                resetInput()
                form.reset({
                  topology: 'leaf-spine',
                  rackCount: 3,
                  rackServers: [16, 16, 16],
                  portsPerServerFrontend: 1,
                  portsPerServerBackend: 1,
                  activeUplinksPerLeaf: 4,
                  connectivityType: '25G',
                  cableType: 'DAC',
                  leafModel: 'S5248F-ON',
                  spineModel: 'S5232F-ON',
                  accessModel: 'S5248F-ON',
                  activeUplinksPerAccess: 4,
                  aggregationModel: 'Z9264F-ON',
                  activeUplinksPerAggregation: 4,
                  coreModel: 'Z9332F-ON',
                  existingSpinesDeployed: false,
                  existingCoreDeployed: false,
                  borderLeafModel: 'none',
                  borderLeafCount: 0,
                  rackSize: '42U',
                  serverUHeight: '1U',
                  switchPositioning: 'ToR',
                })
              }}
            >
              {t('sizing.resetButton')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
