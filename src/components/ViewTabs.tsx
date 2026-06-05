// Server Component — no interactivity needed; active state comes from props
type Props = {
  active: 'goal' | 'daily'
}

const TABS = [
  { key: 'goal', label: 'コミット＆ゴール', href: '/' },
  { key: 'daily', label: 'デイリー', href: '/weekly-stamp' },
] as const

export default function ViewTabs({ active }: Props) {
  return (
    <nav className="flex border-b border-[#ebebeb] mb-4">
      {TABS.map(({ key, label, href }) => (
        <a
          key={key}
          href={href}
          className={`px-4 py-2 text-sm -mb-px ${
            active === key
              ? 'border-b-2 border-[#363737] font-semibold text-[#363737]'
              : 'text-gray-500 hover:text-[#363737]'
          }`}
        >
          {label}
        </a>
      ))}
    </nav>
  )
}
