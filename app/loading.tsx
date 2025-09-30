// app/loading.tsx
import Spinner from "@/components/Spinner";

export default function AppLoading() {
  return (
    <div className="md:ml-0 min-h-screen grid place-items-center">
      <Spinner label="Laster..." size={72} />
    </div>
  );
}
