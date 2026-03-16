import { motion } from 'framer-motion'

type TabId = 'physical' | 'logical'

interface TabsProps {
  active: TabId
  onChange: (id: TabId) => void
}

const tabs: { id: TabId; label: string }[] = [
  { id: 'physical', label: 'Физическая ERD' },
  { id: 'logical', label: 'Логическая ERD' },
]

export function Tabs({ active, onChange }: TabsProps) {
  return (
    <div className="flex rounded-xl bg-slate-800/50 p-1 border border-slate-700/50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className="relative px-5 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          {active === tab.id && (
            <motion.span
              layoutId="tab-indicator"
              className="absolute inset-0 rounded-lg bg-slate-700/80 border border-slate-600/50"
              transition={{ type: 'spring', duration: 0.4 }}
            />
          )}
          <span className="relative z-10">{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
