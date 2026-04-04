import { InfinityLoader } from "@/components/ui/loader-13"

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
      <InfinityLoader size={36} />
    </div>
  )
}
