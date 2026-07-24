<!-- SPDX-License-Identifier: MIT -->
# Contributing to Spaces

Thank you for your interest in contributing to **Spaces**! We welcome contributions from developers of all skill levels.

---

## 1. Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to the project maintainers.

---

## 2. Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) >= 20.x
- [Bun](https://bun.sh/) >= 1.1
- [pnpm](https://pnpm.io/) >= 9.x

### Getting Started
1. Fork and clone the repository:
   ```bash
   git clone https://github.com/YOUR-USERNAME/spaces.git
   cd spaces
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
4. Start development mode:
   ```bash
   pnpm run dev
   ```

---

## 3. Code Standards & Conventions

- **TypeScript:** Strict mode enabled. Do NOT use `any` types.
- **License Headers:** Every `.ts` and `.tsx` file MUST begin with `// SPDX-License-Identifier: MIT`. Run `pnpm run check-license` to verify.
- **Styling:** Vanilla CSS / Tailwind CSS v4.
- **Commit Messages:** Follow [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat: add new MCP tool registration`
  - `fix: resolve race condition in websocket handler`
  - `docs: update self-hosting guide`
  - `chore: bump dependencies`

---

## 4. Pull Request Workflow

1. Create a new topic branch:
   ```bash
   git checkout -b feat/my-new-feature
   ```
2. Make your changes and write unit tests where applicable.
3. Validate your code locally:
   ```bash
   pnpm run check-license
   pnpm run typecheck
   pnpm run lint
   pnpm run build
   pnpm run test
   ```
4. Push to your fork and submit a Pull Request against `main`.
5. Ensure all CI checks pass.
