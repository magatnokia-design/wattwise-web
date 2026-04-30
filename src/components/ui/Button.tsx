import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
	isLoading?: boolean;
};

const baseClasses =
	'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 ring-offset-white disabled:pointer-events-none disabled:opacity-60';

const variantClasses: Record<ButtonVariant, string> = {
	primary:
		'bg-[color:var(--color-primary)] text-white hover:bg-[color:var(--color-primary-dark)]',
	secondary:
		'bg-white text-[color:var(--color-text)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-background)]',
	danger: 'bg-[color:var(--color-error)] text-white hover:bg-red-600',
	ghost: 'bg-transparent text-[color:var(--color-text)] hover:bg-[color:var(--color-background)]',
};

const sizeClasses: Record<ButtonSize, string> = {
	sm: 'h-9 px-3 text-sm',
	md: 'h-11 px-4 text-sm',
	lg: 'h-12 px-5 text-base',
};

const spinnerClasses =
	'h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent';

export default function Button({
	variant = 'primary',
	size = 'md',
	isLoading = false,
	className,
	disabled,
	children,
	...props
}: ButtonProps) {
	const classes = [
		baseClasses,
		variantClasses[variant],
		sizeClasses[size],
		className,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<button
			className={classes}
			disabled={disabled || isLoading}
			aria-busy={isLoading || undefined}
			{...props}
		>
			{isLoading && <span className={spinnerClasses} aria-hidden="true" />}
			<span>{children}</span>
		</button>
	);
}
