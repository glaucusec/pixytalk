# Repository maintenance

## Files versus GitHub settings

Contribution docs, templates, commit hooks, and CI configuration are versioned in this repository. They do not activate branch protection, set merge options, grant a license, or establish a private reporting channel.

After pushing these files, configure the following in GitHub:

- Protect `main` with a ruleset requiring pull requests and the successful `Verify` check from CI. Run CI once so GitHub can discover the check.
- Block force pushes and branch deletion. Decide whether administrators may bypass rules.
- Prefer squash merging and use the PR title as the squash commit title. CI checks Conventional Commit PR titles.
- Require one approval when another maintainer is available. A solo maintainer should not create an approval requirement they cannot satisfy.
- Enable automatic deletion of merged branches if desired.
- Enable private vulnerability reporting where available and publish a private contact channel before inviting security reports.
- Enable dependency alerts and secret scanning where available for the repository.

These are recommendations; no remote settings have been changed by adding this file.

## Ownership and licensing

Add CODEOWNERS when responsible maintainers or teams are agreed. Do not list people who have not accepted ownership. Select an appropriate license and contribution terms before describing PixyTalk as open source or soliciting external code contributions. No license is selected by this setup.

## CI and dependency updates

CI installs using the root lockfile, validates PR titles, and runs `pnpm check`. It uses read-only repository permissions and pinned third-party action revisions. Fork PR jobs receive no application secrets. Avoid changing to `pull_request_target` to run contributor code.

Dependabot is configured for weekly dependency and GitHub Actions updates. Review compatibility and CI results before merging; automated updates do not merge themselves.

Local hooks check staged whitespace/conflict markers, individual commit messages, and the full check suite before pushing. CI checks the PR title, not historical commits; this supports squash merging without rewriting existing history. Hooks can be bypassed locally, so they cannot replace server-side merge rules. The pre-push suite checks the current working tree, so keep it aligned with the commits being pushed; CI verifies the committed revision.

## Releases

There is no release automation or stable release yet. When publishing releases, create version tags, write user-facing release notes, and document incompatible changes and migration steps. Conventional Commits help organize that history but do not publish a release automatically.
