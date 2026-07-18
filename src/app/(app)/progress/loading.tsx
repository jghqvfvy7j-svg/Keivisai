export default function ProgressLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 pt-2">
        <div className="skeleton h-8 w-32 rounded-md" />
        <div className="skeleton h-4 w-56 rounded-md" />
      </div>
      <div className="skeleton h-16 w-full rounded-2xl" />
      <div className="skeleton h-52 w-full rounded-2xl" />
      <div className="skeleton h-52 w-full rounded-2xl" />
    </div>
  );
}
