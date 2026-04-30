import type { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
	title?: string;
	description?: string;
};

export default function Card({
	title,
	description,
	className,
	children,
	...props
}: CardProps) {
	const classes = [
		'rounded-[var(--spacing-radius)] border border-[color:var(--color-border)] bg-white p-5 shadow-sm',
		className,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={classes} {...props}>
			{(title || description) && (
				<div className="mb-4 space-y-1">
					{title && <h3 className="text-base font-semibold">{title}</h3>}
					{description && (
						<p className="text-sm text-[color:var(--color-text-light)]">{description}</p>
					)}
				</div>
			)}
			{children}
		</div>
	);
}
