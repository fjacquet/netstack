import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/shallow'
import { SizingInputSchema } from '@/domain/schemas/input'
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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const LEAF_MODELS = ['S5248F-ON', 'S5224F-ON', 'S5212F-ON'] as const
const SPINE_MODELS = ['S5232F-ON'] as const
const BORDER_LEAF_OPTIONS = ['none', 'S5248F-ON', 'S5224F-ON', 'S5212F-ON'] as const
const RACK_SIZES = ['24U', '42U', '50U'] as const

export function InputForm() {
  const { t } = useTranslation()
  const { input, setInput } = useInputStore(
    useShallow((s) => ({ input: s.input, setInput: s.setInput }))
  )

  // CRITICAL: Do NOT pass generic type argument to useForm with Zod v4
  // @hookform/resolvers v5.2.2 requires type inference from zodResolver
  const form = useForm({
    resolver: zodResolver(SizingInputSchema),
    defaultValues: input,
    mode: 'onChange',
  })

  // Watch all fields for live recalculation
  // Use a ref for the debounce timer on number inputs
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const subscription = form.watch((values, { name }) => {
      // Only push to store if form is valid
      if (!form.formState.isValid) return

      const validValues = values as Record<string, unknown>

      // Debounce number inputs (150ms per UI-SPEC)
      if (name === 'totalServers' || name === 'serversPerRack') {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          setInput(validValues)
        }, 150)
      } else {
        // Select inputs: immediate
        setInput(validValues)
      }
    })

    return () => {
      subscription.unsubscribe()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [form, setInput])

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

            {/* Field 2: Servers per Rack */}
            <FormField
              control={form.control}
              name="serversPerRack"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('sizing.serversPerRack')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={48}
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
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
