export default function ErrorMessage({ message, onRetry }) {
  return (
    <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}
