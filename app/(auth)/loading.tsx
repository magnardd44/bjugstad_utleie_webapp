// app/(auth)/loading.tsx
import Spinner from "@/components/Spinner";

export default function AuthLoading() {
  return (
    <div className="min-h-screen grid place-items-center">
      <Spinner label="Laster..." size={72} />
    </div>
  );
}
