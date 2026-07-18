export default function HomeLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between pt-2">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-4 w-24 rounded-md" />
          <div className="skeleton h-7 w-32 rounded-md" />
        </div>
        <div className="skeleton h-11 w-11 rounded-full" />
      </div>
      <div className="skeleton h-24 w-full rounded-2xl" />
      <div className="skeleton h-44 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton h-20 rounded-2xl" />
        <div className="skeleton h-20 rounded-2xl" />
      </div>
      <div className="skeleton h-40 w-full rounded-2xl" />
    </div>
  );
}
