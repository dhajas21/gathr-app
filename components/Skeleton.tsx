export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={'animate-pulse bg-white/[0.07] rounded-xl ' + className} />
}

export function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">
      <div className="px-4 pt-14 pb-4 flex items-center justify-between">
        <SkeletonBlock className="h-7 w-28" />
        <SkeletonBlock className="h-8 w-8 rounded-xl" />
      </div>
      <div className="px-4 mb-4">
        <SkeletonBlock className="h-10 w-full rounded-2xl" />
      </div>
      <div className="px-4 mb-2">
        <SkeletonBlock className="h-3 w-20 mb-3" />
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4].map(i => <SkeletonBlock key={i} className="h-7 w-20 flex-shrink-0 rounded-full" />)}
        </div>
      </div>
      <div className="px-4 space-y-3 mt-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-[#1C241C] border border-white/[0.06] rounded-2xl overflow-hidden">
            <SkeletonBlock className="h-36 w-full rounded-none rounded-t-2xl" />
            <div className="p-3.5 space-y-2">
              <SkeletonBlock className="h-4 w-3/4" />
              <SkeletonBlock className="h-3 w-1/2" />
              <SkeletonBlock className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProfilePageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">
      <div style={{ background: 'linear-gradient(160deg,#1A2E1A 0%,#0D110D 65%)' }}>
        <div className="flex justify-end px-4 pt-14 pb-3 gap-2">
          {[1, 2, 3, 4].map(i => <SkeletonBlock key={i} className="w-8 h-8 rounded-xl" />)}
        </div>
        <div className="px-4 pb-4 space-y-3">
          <SkeletonBlock className="w-16 h-16 rounded-2xl" />
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="h-3 w-48" />
          <SkeletonBlock className="h-3 w-40" />
        </div>
      </div>
      <div className="flex border-t border-b border-white/10">
        {[1, 2, 3, 4].map((_, i) => (
          <div key={i} className={'flex-1 py-3 flex flex-col items-center gap-1 ' + (i < 3 ? 'border-r border-white/10' : '')}>
            <SkeletonBlock className="h-5 w-8" />
            <SkeletonBlock className="h-2 w-12" />
          </div>
        ))}
      </div>
      <div className="flex border-b border-white/10 px-4 gap-2 py-2">
        {[1, 2, 3, 4].map(i => <SkeletonBlock key={i} className="flex-1 h-6 rounded-lg" />)}
      </div>
      <div className="px-4 pt-4 space-y-3">
        <SkeletonBlock className="h-28 w-full rounded-2xl" />
        <SkeletonBlock className="h-20 w-full rounded-2xl" />
        <SkeletonBlock className="h-48 w-full rounded-2xl" />
      </div>
    </div>
  )
}

export function MessagesPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">
      <div className="px-4 pt-14 pb-3 border-b border-white/10">
        <SkeletonBlock className="h-6 w-28 mb-1" />
        <SkeletonBlock className="h-3 w-20" />
      </div>
      <div className="mt-2 divide-y divide-white/[0.05]">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <SkeletonBlock className="w-11 h-11 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-3.5 w-32" />
              <SkeletonBlock className="h-3 w-48" />
            </div>
            <SkeletonBlock className="h-3 w-8" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function CommunitiesPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">
      <div className="px-4 pt-14 pb-2">
        <div className="flex items-center justify-between mb-2">
          <SkeletonBlock className="h-6 w-28" />
          <SkeletonBlock className="h-8 w-16 rounded-xl" />
        </div>
        <SkeletonBlock className="h-10 w-full rounded-2xl mt-3" />
      </div>
      <div className="flex gap-2 px-4 py-3 overflow-hidden">
        {[1, 2, 3, 4].map(i => <SkeletonBlock key={i} className="h-7 w-20 flex-shrink-0 rounded-full" />)}
      </div>
      <div className="px-4 space-y-3 mt-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-[#1C241C] border border-white/[0.06] rounded-2xl overflow-hidden">
            <SkeletonBlock className="h-14 w-full rounded-none" />
            <div className="p-3 space-y-2">
              <SkeletonBlock className="h-4 w-1/2" />
              <SkeletonBlock className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function NotificationsPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">
      <div className="px-4 pt-14 pb-3 border-b border-white/10">
        <SkeletonBlock className="h-6 w-24 mb-1" />
        <SkeletonBlock className="h-3 w-16" />
      </div>
      <div className="divide-y divide-white/[0.06] mt-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-start gap-3 px-4 py-3.5">
            <SkeletonBlock className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-3.5 w-48" />
              <SkeletonBlock className="h-3 w-32" />
              <SkeletonBlock className="h-2.5 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BookmarksPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-white/10">
        <SkeletonBlock className="w-9 h-9 rounded-xl flex-shrink-0" />
        <SkeletonBlock className="h-6 w-32" />
      </div>
      <div className="px-4 py-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-[#1C241C] border border-white/[0.06] rounded-2xl overflow-hidden">
            <SkeletonBlock className="h-28 w-full rounded-none" />
            <div className="p-3.5 space-y-2">
              <SkeletonBlock className="h-3 w-16" />
              <SkeletonBlock className="h-4 w-3/4" />
              <SkeletonBlock className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CommunityDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#0D110D] pb-32">
      <SkeletonBlock className="h-44 w-full rounded-none" />
      <div className="px-4 pt-3 pb-3 flex items-center gap-3">
        <SkeletonBlock className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-3 w-28" />
        </div>
        <SkeletonBlock className="h-8 w-20 rounded-xl" />
      </div>
      <div className="flex border-b border-white/10">
        {[1, 2, 3].map(i => <SkeletonBlock key={i} className="flex-1 h-9 rounded-none" />)}
      </div>
      <div className="px-4 pt-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-[#1C241C] border border-white/[0.06] rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <SkeletonBlock className="w-8 h-8 rounded-xl flex-shrink-0" />
              <SkeletonBlock className="h-3.5 w-28" />
              <SkeletonBlock className="h-2.5 w-12 ml-auto" />
            </div>
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function HostDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">
      <div className="flex items-center justify-between px-4 pt-14 pb-3">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="w-9 h-9 rounded-xl" />
          <div className="space-y-1.5">
            <SkeletonBlock className="h-5 w-36" />
            <SkeletonBlock className="h-3 w-24" />
          </div>
        </div>
        <SkeletonBlock className="h-8 w-16 rounded-xl" />
      </div>
      <div className="flex px-4 gap-1 mb-4 border-b border-white/10 pb-0">
        {[1, 2, 3].map(i => <SkeletonBlock key={i} className="flex-1 h-8 rounded-none rounded-t-lg" />)}
      </div>
      <div className="px-4 space-y-3 mt-2">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <SkeletonBlock key={i} className="h-24 rounded-2xl" />)}
        </div>
        <SkeletonBlock className="h-20 w-full rounded-2xl" />
        <SkeletonBlock className="h-36 w-full rounded-2xl" />
        <SkeletonBlock className="h-36 w-full rounded-2xl" />
      </div>
    </div>
  )
}

export function PublicProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[#0D110D] pb-32">
      <div style={{ background: 'linear-gradient(160deg,#1A2E1A 0%,#0D110D 65%)' }}>
        <div className="flex items-start justify-between px-4 pt-14 mb-3">
          <SkeletonBlock className="w-9 h-9 rounded-xl" />
          <SkeletonBlock className="w-9 h-9 rounded-xl" />
        </div>
        <div className="px-4 pb-4 space-y-3">
          <SkeletonBlock className="w-16 h-16 rounded-2xl" />
          <SkeletonBlock className="h-5 w-36" />
          <SkeletonBlock className="h-3 w-28" />
          <SkeletonBlock className="h-3 w-44" />
        </div>
      </div>
      <div className="flex border-t border-b border-white/10">
        {[1, 2, 3, 4].map((_, i) => (
          <div key={i} className={'flex-1 py-3 flex flex-col items-center gap-1 ' + (i < 3 ? 'border-r border-white/10' : '')}>
            <SkeletonBlock className="h-5 w-8" />
            <SkeletonBlock className="h-2 w-12" />
          </div>
        ))}
      </div>
      <div className="px-4 pt-4 space-y-3">
        <SkeletonBlock className="h-24 w-full rounded-2xl" />
        <SkeletonBlock className="h-32 w-full rounded-2xl" />
      </div>
    </div>
  )
}

export function EventDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#0D110D] pb-24">
      <SkeletonBlock className="h-64 w-full rounded-none" />
      <div className="px-4 py-4 space-y-4">
        <SkeletonBlock className="h-7 w-3/4" />
        <SkeletonBlock className="h-4 w-1/2" />
        <SkeletonBlock className="h-4 w-2/3" />
        <SkeletonBlock className="h-20 w-full rounded-2xl" />
        <SkeletonBlock className="h-32 w-full rounded-2xl" />
      </div>
    </div>
  )
}
