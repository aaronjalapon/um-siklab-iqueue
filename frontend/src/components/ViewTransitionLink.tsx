'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ComponentProps, ReactNode } from 'react';

interface ViewTransitionLinkProps extends ComponentProps<typeof Link> {
  children: ReactNode;
}

/**
 * ViewTransitionLink
 * A wrapper around next/link that utilizes the View Transitions API for smooth
 * same-document navigations across the Next.js App Router.
 */
export function ViewTransitionLink({
  children,
  href,
  onClick,
  ...props
}: ViewTransitionLinkProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Preserve default behavior for modifiers (e.g., cmd+click for new tab)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }

    e.preventDefault();

    if (onClick) {
      onClick(e);
    }

    // Fallback if the browser doesn't support View Transitions
    if (!document.startViewTransition) {
      router.push(href.toString());
      return;
    }

    // Wrap the router navigation in a view transition.
    // Note: Since router.push is asynchronous in App Router, this will
    // trigger a transition as the new layout renders in.
    const transition = document.startViewTransition(() => {
      router.push(href.toString());
    });

    // MANDATORY Accessibility Routing: ensure focus is reset after transition resolves
    transition.finished.finally(() => {
      // Find the main content area or first heading to route focus
      const mainContent = document.querySelector('main') || document.querySelector('h1');
      if (mainContent) {
        // Elements need a tabindex to be programmatically focusable
        mainContent.setAttribute('tabindex', '-1');
        (mainContent as HTMLElement).focus();
        // Remove outline for mouse users, but keep for keyboard
        (mainContent as HTMLElement).style.outline = 'none';
      }
    });
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
