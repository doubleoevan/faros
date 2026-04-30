import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// stable Account.type identifiers per the schema. uses provenance over Account.source which is a label.
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
                  // span wrapper so Radix Slot has a real element to attach a ref to;
                  // raw <img /> doesn't accept refs reliably.
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
