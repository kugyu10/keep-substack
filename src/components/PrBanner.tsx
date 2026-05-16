import Image from 'next/image'

export default function PrBanner() {
  return (
    <div className="mt-[120px]">
      <p className="text-xs text-gray-400 mb-1">PR:</p>
      <p className="text-xs text-gray-400 mb-2">Substack継続に迷走しているあなたに。管理人うおじゅんも愛読中！</p>
      <a href="https://brmk.io/C8LPYI" target="_blank" rel="noopener noreferrer" className="block w-1/2">
        <Image
          src="/pr/koumei-book.png"
          alt="PR"
          width={640}
          height={335}
          className="w-full h-auto"
        />
      </a>
    </div>
  )
}
