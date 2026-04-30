import type { InputHTMLAttributes } from 'react';
import { useId } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
	label?: string;
	error?: string;
	helperText?: string;
	containerClassName?: string;
};

export default function Input({
	label,
	error,
	helperText,
	containerClassName,
	className,
	id,
	...props
}: InputProps) {
	const generatedId = useId();
	const inputId = id ?? generatedId;
	const describedBy = error
		? `${inputId}-error`
		: helperText
			? `${inputId}-help`
			: undefined;

	const inputClasses = [
		'h-11 w-full rounded-md border bg-white px-3 text-sm text-[color:var(--color-text)] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
		error
			? 'border-[color:var(--color-error)]'
			: 'border-[color:var(--color-border)]',
		className,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={['space-y-1', containerClassName].filter(Boolean).join(' ')}>
			{label && (
				<label
					htmlFor={inputId}
					className="text-sm font-medium text-[color:var(--color-text)]"
				>
					{label}
				</label>
			)}
			<input
				id={inputId}
				className={inputClasses}
				aria-invalid={error ? 'true' : undefined}
				aria-describedby={describedBy}
				{...props}
			/>
			{error ? (
				<p id={`${inputId}-error`} className="text-xs text-[color:var(--color-error)]">
					{error}
				</p>
			) : helperText ? (
				<p id={`${inputId}-help`} className="text-xs text-[color:var(--color-text-light)]">
					{helperText}
				</p>
			) : null}
		</div>
	);
}
