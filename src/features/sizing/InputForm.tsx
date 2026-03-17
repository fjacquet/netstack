import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/shallow'
import { useInputStore } from '@/store/inputStore'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
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

const LEAF_MODELS = ['S5248F-ON', 'S5224F-ON', 'S5212F-ON'] as const
const SPINE_MODELS = ['S5232F-ON'] as const
const BORDER_LEAF_OPTIONS = ['none', 'S5248F-ON', 'S5224F-ON', 'S5212F-ON'] as const
const RACK_SIZES = ['24U', '42U', '50U'] as const

/**
 * Bridge form values for the UI. The UI collects totalServers + rackCount
 * and the form translates those to the racks array format used by SizingInput.
 *
 * RACK-03: The UI uses a simplified "total servers / racks count" input that
 * generates a uniform racks array. Full per-rack configuration is a future enhancement.
 */
interface FormValues {
  totalServers: number
  rackCount: number
  connectivityType: '25G' | '100G'
  cableType: 'DAC' | 'AOC' | 'fiber'
  leafModel: 'S5248F-ON' | 'S5224F-ON' | 'S5212F-ON'
  spineModel: 'S5232F-ON'
  borderLeafModel: 'S5248F-ON' | 'S5224F-ON' | 'S5212F-ON' | 'none'
  borderLeafCount: number
  rackSize: '24U' | '42U' | '50U'
}

/** Convert form values to a uniform racks array */
function toRacksArray(totalServers: number, rackCount: number): Array<{ serverCount: number }> {
  const safeCount = Math.max(1, Math.floor(rackCount))
  const safeTotal = Math.max(0, Math.floor(totalServers))
  const base = Math.floor(safeTotal / safeCount)
  const remainder = safeTotal % safeCount
  return Array.from({ length: safeCount }, (_, i) => ({
    serverCount: i < remainder ? base + 1 : base,
  }))
}

export function InputForm() {
  const { t } = useTranslation()
  const { input, setInput, resetInput } = useInputStore(
    useShallow((s) => ({ input: s.input, setInput: s.setInput, resetInput: s.resetInput }))
  )

  // Derive display values from racks array
  const totalServers = input.racks.reduce((sum, r) => sum + r.serverCount, 0)
  const rackCount = input.racks.length

  // CRITICAL: Do NOT pass generic type argument to useForm with Zod v4
  const form = useForm<FormValues>({
    defaultValues: {
      totalServers,
      rackCount,
      connectivityType: input.connectivityType,
      cableType: input.cableType,
      leafModel: input.leafModel,
      spineModel: input.spineModel,
      borderLeafModel: input.borderLeafModel,
      borderLeafCount: input.borderLeafCount,
      rackSize: input.rackSize,
    },
    mode: 'onChange',
  })

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const subscription = form.watch((values, { name }) => {
      const v = values as Partial<FormValues>

      // Debounce number inputs (150ms per UI-SPEC)
      if (name === 'totalServers' || name === 'rackCount') {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          const ts = Number(v.totalServers ?? totalServers)
          const rc = Number(v.rackCount ?? rackCount)
          if (ts > 0 && rc > 0) {
            setInput({ racks: toRacksArray(ts, rc) })
          }
        }, 150)
      } else {
        // Select inputs: immediate
        const { totalServers: _ts, rackCount: _rc, ...rest } = v as FormValues
        const validRest = Object.fromEntries(
          Object.entries(rest).filter(([, val]) => val !== undefined && val !== null && String(val) !== '')
        )
        if (Object.keys(validRest).length > 0) {
          setInput(validRest)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [form, setInput, totalServers, rackCount])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          {t('sizing.heading')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-4">
            {/* Field 1: Total Server Count */}
            <FormField
              control={form.control}
              name="totalServers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('sizing.totalServers')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={10000}
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

            {/* Field 2: Rack Count */}
            <FormField
              control={form.control}
              name="rackCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('sizing.rackCount', { defaultValue: 'Number of Racks' })}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={200}
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

            {/* Field 3: Connectivity Type */}
            <FormField
              control={form.control}
              name="connectivityType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('sizing.connectivityType')}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('sizing.selectConnectivity')}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="25G">
                        {t('sizing.connectivity25G')}
                      </SelectItem>
                      <SelectItem value="100G">
                        {t('sizing.connectivity100G')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Field 4: Cable Type */}
            <FormField
              control={form.control}
              name="cableType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('sizing.cableType')}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('sizing.selectCable')}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DAC">
                        {t('sizing.cableDAC')}
                      </SelectItem>
                      <SelectItem value="AOC">
                        {t('sizing.cableAOC')}
                      </SelectItem>
                      <SelectItem value="fiber">
                        {t('sizing.cableFiber')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Field 5: Leaf Switch Model */}
            <FormField
              control={form.control}
              name="leafModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('sizing.leafModel')}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('sizing.selectLeafModel')}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LEAF_MODELS.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Field 6: Spine Switch Model */}
            <FormField
              control={form.control}
              name="spineModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('sizing.spineModel')}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('sizing.selectSpineModel')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SPINE_MODELS.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Field 7: Border Leaf Model */}
            <FormField
              control={form.control}
              name="borderLeafModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('sizing.borderLeafModel')}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
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

            {/* Field 8: Border Leaf Count (only if border model selected) */}
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

            {/* Field 9: Rack Size */}
            <FormField
              control={form.control}
              name="rackSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('sizing.rackSize')}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('sizing.selectRackSize')}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RACK_SIZES.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Reset button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => {
                resetInput()
                form.reset({
                  totalServers: 48,
                  rackCount: 3,
                  connectivityType: '25G',
                  cableType: 'DAC',
                  leafModel: 'S5248F-ON',
                  spineModel: 'S5232F-ON',
                  borderLeafModel: 'none',
                  borderLeafCount: 0,
                  rackSize: '42U',
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
