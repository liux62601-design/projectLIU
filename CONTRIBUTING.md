# Contributing to TechTutorial Pro

Thank you for your interest in contributing! This document outlines the process for contributing to TechTutorial Pro.

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Bugs

- Search existing issues to avoid duplicates
- Use the bug report template
- Include clear steps to reproduce, expected behavior, and actual behavior
- Note your browser, OS, and any relevant environment details

### Suggesting Features

- Search existing issues and discussions
- Explain the problem your feature would solve
- Describe the solution you have in mind
- Consider scope and alignment with the project's goals

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes following these guidelines:
   - Write semantic, accessible HTML
   - Follow existing CSS conventions (BEM or similar)
   - Keep JavaScript vanilla unless a framework is explicitly required
   - Test across major browsers (Chrome, Firefox, Safari, Edge)
   - Ensure responsive design works at all breakpoints
4. Commit with clear messages: `git commit -m "Add: description of change"`
5. Push your branch: `git push origin feature/your-feature-name`
6. Open a pull request against the `main` branch

### Commit Convention

| Prefix    | Usage                                      |
|-----------|--------------------------------------------|
| `Add:`    | New features or content                    |
| `Fix:`    | Bug fixes                                  |
| `Update:` | Improvements to existing features          |
| `Docs:`   | Documentation changes                      |
| `Style:`  | Formatting, missing semicolons, etc.       |
| `Refactor:` | Code restructuring without behavior change |

### Tutorial Contributions

When contributing a tutorial:

- Include a clear title, objectives, and prerequisites
- Break content into logical sections
- Provide complete, runnable code examples
- Add screenshots or diagrams where helpful
- Include a summary and next-steps section

## Development Setup

1. Clone the repository
2. Open `index.html` in your browser for local development
3. Use a local server for accurate path resolution (e.g., `npx serve .` or VS Code Live Server)

## Review Process

- All PRs require at least one review
- CI checks must pass (when configured)
- Maintainers may request changes
- Once approved, a maintainer will merge your PR

## Questions?

Open a discussion or reach out to the maintainers.
