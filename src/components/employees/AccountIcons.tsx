import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// look up by Account.type. use stable codes instead of display labels.
const ACCOUNT_ICONS: Record<string, { src: string; label: string }> = {
  vcs: { src: '/icons/github.png', label: 'GitHub' },
  tms: { src: '/icons/jira.png', label: 'Jira' },
  ims: { src: '/icons/pagerduty.png', label: 'PagerDuty' },
  cal: { src: '/icons/google-calendar.png', label: 'Google Calendar' },
}

export type AccountIconsProps = {
  accounts: ReadonlyArray<{ type: string; source: string; uid: string }>
  className?: string
}

export function AccountIcons({ accounts, className }: AccountIconsProps) {
  if (accounts.length === 0) {
    return <span className={cn('text-muted-foreground text-xs', className)}>None</span>
  }
  return (
    <ul className={cn('flex items-center gap-2', className)} aria-label="Connected accounts">
      {accounts.map((account) => {
        const icon = ACCOUNT_ICONS[account.type]
        const label = icon?.label ?? account.source
        return (
          <li key={account.type}>
            <Tooltip>
              <TooltipTrigger asChild>
                {icon ? (
                  // use a span wrapper because Radix Slot needs a real element and <img /> can't take refs.
                  <span className="inline-flex">
                    <img src={icon.src} alt={label} className="size-5 rounded-sm object-contain" />
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">{label}</span>
                )}
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          </li>
        )
      })}
    </ul>
  )
}
