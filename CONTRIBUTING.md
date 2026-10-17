# Contributing

Thanks for wanting to help! This project is open source, and anyone can propose changes. To keep the code safe and consistent, **nothing is merged without the maintainer's review and approval.**

## How it works

1. **Open an issue first** for anything bigger than a typo, so we can agree on the approach.
2. **Fork** the repo and create a branch: `fix/short-description` or `feat/short-description`.
3. Make your change and run:
   ```bash
   npm install
   npm run check
   ```
4. **Open a pull request** to `main` and fill in the template.
5. The maintainer reviews it. You may be asked for changes. Once approved, it's merged.

Direct pushes to `main` are blocked for everyone, including the maintainer.

## Guidelines

- Keep PRs small and focused: one fix or feature each.
- Test on at least one provider (Gemini, Claude, ChatGPT or DeepSeek) and say which one in the PR.
- Selectors on AI sites break often. If you fix one, mention the site and date.
- **Never** add secrets, personal paths, analytics/telemetry, or remote code loading. PRs that do will be closed.
- Don't commit `node_modules/`. Releases are built by CI.
- Match the existing code style and keep the README in sync with behavior changes.

## License of contributions

By submitting a pull request, you agree that your contribution is licensed under the project's [GPL-3.0](LICENSE) license.

## Reporting bugs

Use the [bug report form](../../issues/new/choose) and include provider, browser, OS and the button color when it fails.

## Security issues

Do **not** open a public issue. See [SECURITY.md](SECURITY.md).

## Code of conduct

By participating you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).
