# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of TechTutorial Pro seriously. If you believe you have found a security vulnerability, please report it to us through one of the following channels:

- **Email**: security@techtutorial-pro.dev (create this address for your project)
- **GitHub Issues**: Do NOT open a public issue for security vulnerabilities. Instead, use the "Report a vulnerability" button under the Security tab.

Please include the following information in your report:

- A detailed description of the vulnerability
- Steps to reproduce the issue
- Potential impact of the vulnerability
- Any suggested fixes or mitigations

## Response Timeline

- **Acknowledgment**: Within 48 hours of submission
- **Assessment**: Within 5 business days
- **Resolution**: We aim to publish a fix within 30 days, depending on severity

## Disclosure Policy

We follow coordinated disclosure. Once a fix is available, we will:

1. Release a patch
2. Publish a security advisory on GitHub
3. Credit the reporter (unless anonymity is requested)

## Scope

Since this is a static site, security concerns are primarily limited to:

- Client-side vulnerabilities (XSS, clickjacking)
- Dependency vulnerabilities in build tooling
- Content security policy misconfigurations
- Sensitive data exposure in client-side code
