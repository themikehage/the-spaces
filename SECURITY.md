<!-- SPDX-License-Identifier: MIT -->

# Security Policy

## Supported Versions

We release security updates for the following versions of **Spaces**:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

---

## Reporting a Vulnerability

If you discover a potential security vulnerability in **Spaces**, please do **NOT** open a public issue.

Instead, please report security vulnerabilities via GitHub Security Advisories or by emailing the maintainers directly.

### What to Include in Your Report

- A detailed description of the vulnerability.
- Steps or a proof-of-concept (PoC) script to reproduce the issue.
- Impact evaluation (e.g., privilege escalation, remote code execution, data leak).

### Response Timeline

- **Acknowledgement:** Within 48 hours.
- **Triage & Assessment:** Within 7 business days.
- **Fix Release:** Vulnerabilities will be patched in a security patch release as soon as reasonably possible.

---

## Threat Model & Known Limitations

**Single-Node Trusted Operator Model:**
Spaces is designed for self-hosted, single-tenant or trusted-team environments.

- **Bash Execution:** Spaces agent `bash` runs as the **server OS user** with access to that user's data directory. It is **not** a multi-tenant hardened sandbox (such as gVisor, Firecracker, or bubblewrap). Do not expose a shared host instance to untrusted end-users without additional process or container isolation.
- **Preview Isolation:** Static previews serve workspace web applications. In production, static preview requests require session authentication by default unless `SPACES_PUBLIC_PREVIEW=1` is explicitly set.
