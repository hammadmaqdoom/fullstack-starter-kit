# Tax / statutory compliance boundary

**Polaris** calculates payroll **inputs** and export packs (pay runs, contractor batches, country-aware rates from config tables).  

**Out of scope for Polaris:** statutory remittance / filing portals (EOBI, CPF, WPS, tax authority portals, etc.). Finance performs filing in external systems using Polaris export packs (PDF/Excel). No live Xero API in v1.

Country rules must resolve via `employment_type_country_configs` / statutory rate schedules — never hard-coded `if (country === 'PK')` branches.

See PRD payroll / finance sections and `docs/project-requirements/database-design.md` for rate and export entities.
