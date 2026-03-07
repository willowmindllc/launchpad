'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/projects', label: 'Projects', icon: '📁' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

interface SidebarProps {
  onNavClick?: () => void
  onTrashClick?: () => void
  trashCount?: number
}

export function Sidebar({ onNavClick, onTrashClick, trashCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserName(user?.user_metadata?.full_name || user?.email || 'User')
    })
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border/50 bg-card">
      <div className="flex h-14 items-center gap-2 border-b border-border/50 px-4">
        <span className="text-xl">🚀</span>
        <span className="text-lg font-bold">LaunchPad</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} onClick={onNavClick}>
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start gap-2',
                pathname.startsWith(item.href) && 'bg-accent text-accent-foreground'
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Button>
          </Link>
        ))}
      </nav>

      {onTrashClick && (
        <div className="px-3 pb-1">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => { onTrashClick(); onNavClick?.() }}
          >
            <Trash2 className="size-4" />
            Trash
            {trashCount > 0 && (
              <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                {trashCount}
              </Badge>
            )}
          </Button>
        </div>
      )}

      <div className="border-t border-border/50 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {userName?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm truncate">{userName || 'Loading...'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
