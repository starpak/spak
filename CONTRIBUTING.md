# Contributing to Spak ✨

> Thank you for wanting to contribute to Spak! (>ω<)ﾉ☆

> **中文版**: [CONTRIBUTING.zh.md](CONTRIBUTING.zh.md)

---

## 🐱 How to Get Started?

### 1. Get Familiar

Spak is a **pnpm monorepo** TypeScript project! Make sure your environment is ready:

- **Node.js** >= 18
- **pnpm** >= 10

```bash
# Clone the repository
git clone https://gitlink.org.cn/starpak/spak.git
cd spak

# Install dependencies
pnpm install

# Build the project
pnpm build
```

### 2. Find Something to Work On

Suggestions:

- 🐛 Fix **Bugs** — Look for `bug` labeled issues
- ✨ Add **Features** — Check out `feature request` labels
- 📖 Write **Documentation** — README, API docs, all welcome!
- 🧪 Add **Tests** — The higher the coverage, the better!

### 3. Start Working!

```bash
# Create a new branch
git checkout -b feat/your-feature-name
# Or
git checkout -b fix/your-bug-fix
```

## 📂 Project Structure

```
spak/
├── packages/        # Core packages!
│   ├── core/        # 🧠 Core brain
│   ├── spak-cli/    # 🎮 CLI helper
│   ├── loader/      # 📂 Config loader
│   ├── config/      # ⚙️ Config manager
│   ├── locales/     # 🌐 Internationalization
│   ├── usefor/      # 🧰 Toolbox
│   ├── ccmd/        # ⌨️ Config commands
│   ├── cpc/         # 🔒 Safety check
│   └── i18n-utils/  # 🌍 i18n utilities
├── plugins/         # Plugins!
│   ├── server/      # 🖥️ Server service
│   ├── http/        # 🌐 HTTP related
│   ├── hmr/         # 🔥 Hot reload
│   └── daemon/      # 👻 Background daemon
└── spak.config.yml  # Spak config file
```

## ✍️ Coding Standards

- **TypeScript** — Write TypeScript, not JavaScript!
- **ESLint** — We use ESLint to check code, run it before committing
- **Naming Conventions**:
  - Variables/Functions: `camelCase`
  - Classes/Interfaces: `PascalCase`
  - Files/Directories: `kebab-case`
- **Commit Messages** — Use [Conventional Commits](https://www.conventionalcommits.org/) style:

```
feat: Add awesome new feature
fix: Fix that annoying little bug
docs: Update README documentation
chore: Organize dependencies
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @spakjs/core test
```

## 🚀 Submitting a Pull Request

1. Make sure your branch is up to date with `master`
2. Run all tests to ensure they pass
3. Submit a PR using the provided template
4. Wait for maintainer review

## 💬 Communication

- **Issues** — Report bugs or request features
- **Discussions** — Chat and ask questions

---

> Thank you again for contributing to Spak! (っ´ω`)ﾉ✨
> If you have any questions, feel free to ask!
