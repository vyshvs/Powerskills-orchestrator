# Security Policy

## Supported Versions

PowerSkills Memory Orchestrator follows semantic versioning. Only the latest major version receives security updates.

| Version | Supported          | Status           |
| ------- | ------------------ | ---------------- |
| 3.5.x   | :white_check_mark: | Current release  |
| 3.x.x   | :white_check_mark: | Security patches |
| 2.x.x   | :x:                | End of life      |
| < 2.0   | :x:                | End of life      |

## Security Features

- **Zero Dependencies**: No third-party production dependencies = minimal attack surface
- **Pure JavaScript**: No native modules or binary dependencies
- **CodeQL Scanning**: Automated security scanning on every push
- **Memory Isolation**: In-memory data storage with session-level isolation
- **Input Validation**: All user inputs validated before processing
- **No External Network Calls**: Operates entirely locally (network calls are mocked)

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly:

### How to Report

1. **DO NOT** open a public GitHub issue for security vulnerabilities
2. Email security concerns to: **vysakhvs91@gmail.com**
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Initial Response**: Within 48 hours
- **Status Updates**: Every 7 days until resolved
- **Resolution Timeline**: 
  - Critical vulnerabilities: 7 days
  - High severity: 14 days
  - Medium severity: 30 days
  - Low severity: 90 days

### Disclosure Policy

- We will acknowledge your report within 48 hours
- We will provide a detailed response within 7 days
- We will work with you to understand and resolve the issue
- Once fixed, we will publicly disclose the vulnerability with credit to the reporter (unless anonymity is requested)
- Security patches will be released as soon as possible

## Security Best Practices

When using PowerSkills Memory Orchestrator:

1. **Keep Updated**: Always use the latest version
2. **Review Memory Contents**: Sensitive data stored in memory should be cleared appropriately
3. **Validate Inputs**: Always validate and sanitize user inputs before passing to the plugin
4. **Access Control**: Implement appropriate access controls in your application layer
5. **Audit Logs**: Review session recordings for unusual activity

## Known Limitations

1. **Memory Persistence**: Data is in-memory only (no encryption at rest because there is no "at rest")
2. **Network Security**: Mock HTTP responses for testing - production deployments should implement real HTTPS
3. **Authentication**: Plugin does not implement authentication - this is the responsibility of the consuming application

## Security Audit History

- **2026-08-29**: CodeQL Alert #9 fixed - Useless assignment to local variable
- **2026-08-28**: Initial security audit completed - 0 high/medium vulnerabilities found
- **2026-08-28**: Zero dependency verification confirmed

## Contact

For security-related questions or concerns:
- Email: vysakhvs91@gmail.com
- GitHub Issues (non-security): https://github.com/vyshvs/Powerskills-orchestrator/issues
