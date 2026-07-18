export default function WorkoutsLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 pt-2">
        <div className="skeleton h-4 w-20 rounded-md" />
        <div className="skeleton h-8 w-56 rounded-md" />
      </div>
      <div className="skeleton h-10 w-full rounded-full" />
      <div className="skeleton h-20 w-full rounded-2xl" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}
