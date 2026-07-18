export default function LibraryLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="skeleton h-8 w-40 rounded-md" />
      <div className="skeleton h-11 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
