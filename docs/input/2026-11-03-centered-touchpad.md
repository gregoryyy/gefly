# Centered touchpad controls, 2026-11-03

User:

> add option for the following control:
>
> touchpad middle is steering middle, always.
> view steering with drag, view steering does not auto-recenter.

Implementation interpretation, not an additional user answer: the browser's
neutral reference is the center of the visible flight view. Browser pointer
coordinates do not identify the physical center of a touchpad. The new optional
mode preserves the existing click-to-toggle and hold-drag gestures while keeping
that view-center reference and retaining the dragged camera orientation.
