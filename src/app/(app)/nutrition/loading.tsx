export default function NutritionLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 pt-2">
        <div className="skeleton h-8 w-40 rounded-md" />
        <div className="skeleton h-4 w-64 rounded-md" />
      </div>
      <div className="skeleton h-32 w-full rounded-2xl" />
      <div className="skeleton h-40 w-full rounded-2xl" />
      <div className="skeleton h-24 w-full rounded-2xl" />
    </div>
  );
}
