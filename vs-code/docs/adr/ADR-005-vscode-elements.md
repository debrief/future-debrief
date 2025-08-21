
# ADR-005: Use of vscode-elements Library for UI Components in Debrief VS Code Extensions

## Status
Accepted

## Context
When building Debrief as a set of VS Code extensions, we need to create user interfaces that are visually consistent with the native VS Code experience. This includes custom editors, sidebars, and webviews. Achieving a seamless look and feel, as well as accessibility and maintainability, is a key requirement.

## Decision
We have decided to use the [vscode-elements](https://vscode-elements.github.io/) library to build our UI components for Debrief’s VS Code extensions. This library provides a set of web components that closely match the appearance and behavior of native VS Code UI elements.

## Alternatives Considered

1. **Build custom components from scratch**
	- Pros: Full control over design and implementation; no external dependencies.
	- Cons: High development and maintenance cost; risk of UI drift from VS Code updates; accessibility and theming challenges.

2. **Use a general-purpose UI library (e.g., Material UI, Ant Design, Fluent UI)**
	- Pros: Mature, well-documented, and feature-rich; good accessibility support.
	- Cons: Visual inconsistency with VS Code; additional CSS/theming work required; larger bundle size.

3. **Use [vscode-elements](https://vscode-elements.github.io/)**
	- Pros: Native look and feel; minimal theming effort; maintained by the community; designed for VS Code webviews; supports accessibility and theming out of the box.
	- Cons: Smaller ecosystem; may lack some advanced components; potential for slower updates if VS Code UI evolves rapidly.  Significantly, it appears to lack the `slider` control we traditionally provide in the TimeController.

## Consequences

- Our UI will closely match the native VS Code experience, improving user familiarity and reducing cognitive load.
- We reduce the effort required to maintain visual consistency and accessibility as VS Code evolves.
- We depend on the continued maintenance of the vscode-elements library, and may need to contribute fixes or enhancements if our needs outpace its development.
- If we need highly custom UI elements, we may still need to extend or supplement vscode-elements.

## References
- [vscode-elements documentation](https://vscode-elements.github.io/)

