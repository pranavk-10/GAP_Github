import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center">
      <h1 className="text-5xl font-bold">404</h1>
      <p className="mt-3 text-gray-600">
        Page not found
      </p>

      <button
        onClick={() => navigate("/")}
        className="mt-6 bg-cyan-600 text-white px-6 py-3 rounded-full"
      >
        Go Home
      </button>
    </div>
  );
}