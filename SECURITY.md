# Security policy

## Project status

PixyTalk is in early development and has no stable supported release or published security response SLA. Security fixes currently target the development branch, `main`.

## Report a vulnerability privately

If GitHub private vulnerability reporting is enabled, open the repository's **Security → Advisories → Report a vulnerability** form. Its availability depends on repository settings; adding this file does not enable it.

If the form is unavailable, use a private contact method provided on the maintainer's GitHub profile. If none is listed, request a private reporting channel without disclosing the vulnerability in a public issue. A dedicated security email has not yet been published.

Include affected code or versions, reproduction steps using synthetic data, the potential impact, and any proposed mitigation. Do not include live credentials or customer data. Do not test against other people's tenants or accounts.

Keep exploit details private while a fix is being coordinated. Maintainers should acknowledge the report, assess the impact, prepare a fix, and agree on disclosure when possible.

## Safe development

- Use placeholder values in committed environment examples.
- If a credential is exposed, revoke or rotate it; removing it from a file is insufficient.
- Treat authorization, tenant isolation, webhook validation, and trusted tool execution as security-sensitive changes.
- Use synthetic conversations in tests and bug reports.
