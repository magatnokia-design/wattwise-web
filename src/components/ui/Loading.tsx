type LoadingProps = {
  fullScreen?: boolean;
  message?: string;
};

export default function Loading({ fullScreen = false, message = 'Loading...' }: LoadingProps) {
  const containerClass = [
    'flex w-full items-center justify-center gap-3 text-[color:var(--color-text-light)]',
    fullScreen ? 'min-h-screen' : 'py-3',
  ].join(' ');

  return (
    <div className={containerClass} role="status" aria-live="polite" aria-busy="true">
      <span
        className="h-7 w-7 animate-spin rounded-full border-2 border-current border-t-transparent"
        aria-hidden="true"
      />
      <span className="text-sm">{message}</span>
    </div>
  );
}
