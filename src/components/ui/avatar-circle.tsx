export default function AvatarCircle({ initials }: { initials: string }) {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full font-semibold bg-gradient-to-br from-emerald-500 to-blue-500 text-white">
      {initials}
    </span>
  );
}