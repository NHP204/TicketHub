import Button from './ui/Button.jsx';
import Icon from './ui/Icon.jsx';

export default function ErrorMessage({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-panel border border-danger/30 bg-danger/5 px-4 py-3 text-base text-ink"
    >
      <Icon name="alert" className="mt-0.5 text-danger" />
      <div>
        <p>{message}</p>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry} className="mt-3">
            Thử lại
          </Button>
        )}
      </div>
    </div>
  );
}
