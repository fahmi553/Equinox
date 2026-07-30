# Software UI/UX, Development and QA Guidelines

## 1. Purpose and Scope

This handbook is a reusable reference for software teams building products quickly, including AI-assisted and rapid "vibe coding" workflows. It helps developers, UI/UX designers, QA testers, product owners, and reviewers identify implementation details that are often missed before release.

It covers frequently overlooked areas including usability, accessibility, security, privacy, legal readiness, frontend quality, form behaviour, loading and feedback states, responsive design, and QA verification.

The goal is not to slow teams down. The goal is to make fast delivery safer, more consistent, and easier to review.

## 2. Priority Definitions

| Priority | Definition | Typical Release Decision |
|---|---|---|
| Critical | Required to protect users, data, access control, business integrity, or legal/compliance readiness. Failure may block production release. | Must be resolved before production unless formally accepted by qualified leadership. |
| High | Important for core usability, reliability, accessibility, maintainability, or operational readiness. Failure may significantly affect users or support teams. | Should be resolved before general release. |
| Medium | Improves quality, consistency, efficiency, or edge-case behaviour. Failure may cause friction but usually does not block limited release. | Should be planned and tracked if not fixed before release. |
| Nice to Have | Improves polish, delight, or optional convenience without affecting core safety or usability. | Can be improved iteratively after release. |

**Release decision guidance**

Priority should be assigned based on user impact, data sensitivity, business risk, affected user groups, likelihood, and available workaround. A visual or aesthetic issue may become Critical if it blocks a core flow, makes important content unreadable, prevents accessibility use, or causes users to make unsafe decisions. A purely decorative inconsistency should not block release unless it damages trust, brand requirements, or usability in a material way.

When a team accepts an unresolved issue, record the owner, reason, user impact, workaround, target fix date, and approval source.

## 3. Legal, Privacy and Compliance

Legal and compliance requirements depend on jurisdiction, industry, data type, company policy, and the way the product is used. This section provides implementation guidance, not legal advice. Qualified legal, privacy, or compliance personnel should review applicable requirements.

### Privacy Policy

| Priority | Rule |
|---|---|
| Critical | Provide a Privacy Policy when the product collects, stores, processes, shares, or tracks personal data. |

**What should be implemented**

A Privacy Policy should explain what data is collected, why it is collected, how it is used, how long it is retained, whether it is shared, what rights users may have, and how users can contact the organisation.

**Why it matters**

Users need to understand how their information is handled. Missing or unclear privacy information can create trust, compliance, and support risks.

**Developers should**

- [ ] Link the Privacy Policy from relevant pages such as sign-up, login, checkout, account settings, footer, and consent screens.
- [ ] Ensure links work in production and staging.
- [ ] Avoid collecting personal data before required disclosures are available.
- [ ] Keep privacy-related UI text consistent across the application.
- [ ] Maintain a data inventory showing personal data fields, purpose, storage location, retention, sharing, and owner.
- [ ] Align frontend forms, backend fields, analytics events, exports, and support tools with the approved data inventory.

**QA should test**

- [ ] Privacy Policy links are visible and accessible.
- [ ] Links work on desktop and mobile.
- [ ] The policy is reachable before users submit personal data.
- [ ] Policy references are consistent across the product.
- [ ] Collected fields match the approved data inventory.
- [ ] Analytics and support tooling do not collect personal data beyond the approved scope.

**Common failure examples**

- Privacy link exists only in the footer and is missing from account creation.
- App collects phone numbers but the policy does not mention them.
- Privacy page works locally but returns 404 in production.

### Cookie and Tracking Consent

| Priority | Rule |
|---|---|
| Critical | Where consent is legally required, do not load non-essential analytics, advertising, or tracking technologies before valid consent. |

**What should be implemented**

Cookie and tracking consent should separate essential and non-essential technologies. Users should be able to accept, reject, manage preferences, and withdraw consent where required.

**Why it matters**

Tracking before valid consent can create privacy and compliance risk. Users also need meaningful control over non-essential tracking.

**Developers should**

- [ ] Classify essential and non-essential cookies or trackers.
- [ ] Block non-essential scripts until valid consent is recorded where required.
- [ ] Provide accept, reject, and preference controls.
- [ ] Respect the saved consent choice across sessions.
- [ ] Allow consent withdrawal or preference changes.
- [ ] Document which services are loaded under each consent category.
- [ ] Avoid dark patterns that make rejection materially harder than acceptance.

**QA should test**

- [ ] Non-essential trackers do not load before consent where required.
- [ ] Accept, reject, and preference choices work.
- [ ] Consent choices persist correctly.
- [ ] Users can change or withdraw consent.
- [ ] Reject and preference controls are visible and usable on mobile.
- [ ] Consent categories match the documented tracking services.

**Common failure examples**

- Analytics fires before the banner appears.
- Reject button closes the banner but tracking still runs.
- Consent preferences are lost after refresh.

### Terms of Service

| Priority | Rule |
|---|---|
| High | Provide Terms of Service where user accounts, paid services, user content, platform rules, or operational restrictions apply. |

**What should be implemented**

Terms of Service should define acceptable use, prohibited behaviour, account responsibilities, suspension or termination rules, limitation of liability, and dispute-related provisions where relevant.

**Why it matters**

Terms help users understand service rules and operational boundaries. They do not automatically provide complete legal protection and should be reviewed by qualified personnel.

**Developers should**

- [ ] Link Terms of Service from account creation, checkout, footer, and account pages where appropriate.
- [ ] Capture agreement where the business requires explicit acceptance.
- [ ] Version terms when acceptance history is important.
- [ ] Store acceptance timestamp, terms version, and user identifier when explicit acceptance is required.
- [ ] Provide a review path for updated terms where users must accept changes.

**QA should test**

- [ ] Terms links are visible and functional.
- [ ] Required acceptance controls cannot be bypassed through the UI.
- [ ] Required acceptance cannot be bypassed through direct API calls.
- [ ] Acceptance records include the expected version and timestamp where required.
- [ ] Updated terms flows do not lock users into unusable states unless the business intentionally requires blocking access.

**Common failure examples**

- Sign-up requires agreement in the UI but the API accepts requests without agreement.
- Terms page contains outdated company or product names.

### Personal Data Protection

| Priority | Rule |
|---|---|
| Critical | Collect only necessary personal data and protect it throughout collection, storage, access, logging, and deletion. |

**What should be implemented**

Personal data handling should follow data minimisation, defined retention and deletion behaviour, appropriate access restrictions, and protection in transit and at rest.

**Why it matters**

Unnecessary or exposed personal data increases privacy, security, and operational risk.

**Developers should**

- [ ] Avoid collecting unnecessary personal information.
- [ ] Define retention and deletion behaviour.
- [ ] Support account and data deletion where required.
- [ ] Protect sensitive data in transit and at rest.
- [ ] Restrict access based on roles and business need.
- [ ] Avoid exposing personal data in URLs, logs, analytics, frontend code, error messages, and API responses.
- [ ] Define export, correction, deletion, and access-request workflows where required.
- [ ] Apply masking or tokenisation for sensitive values shown to support, admin, or analytics users.
- [ ] Separate production data from development and testing environments.

**QA should test**

- [ ] Personal data is not exposed in URLs or browser-visible source.
- [ ] API responses return only required data.
- [ ] Logs do not include unnecessary sensitive data.
- [ ] Deleted or restricted accounts behave as expected.
- [ ] Role-restricted users see masked or limited data as expected.
- [ ] Development and test environments do not use unapproved production personal data.
- [ ] Export, correction, deletion, and access-request workflows work where required.

**Common failure examples**

- Email addresses appear in query strings.
- API returns full user profiles when only display names are needed.
- Deleted user data remains visible in admin screens without a valid reason.

**Required note**

"Legal requirements vary by country, industry, and data type. The project must be reviewed against applicable laws and company policies."

## 4. Security and Technical Safeguards

### Authentication

| Priority | Rule |
|---|---|
| Critical | Authentication must protect account access, credentials, sessions, and recovery flows. |

**What should be implemented**

Use secure password handling, session expiration, logout invalidation, password reset token expiry, disabled account handling, locked account handling, and multiple-device session handling. MFA should be considered for sensitive systems.

**Why it matters**

Weak authentication can allow account takeover, data exposure, and unauthorised actions.

**Developers should**

- [ ] Hash passwords with an approved password hashing algorithm.
- [ ] Expire sessions after appropriate inactivity or absolute time limits.
- [ ] Invalidate sessions on logout.
- [ ] Expire password reset tokens.
- [ ] Store reset tokens as hashed or otherwise protected values when practical.
- [ ] Use secure, HTTP-only, same-site cookies for browser sessions where cookie sessions are used.
- [ ] Regenerate session identifiers after login and privilege changes.
- [ ] Block disabled or locked accounts consistently.
- [ ] Define behaviour for multiple-device sessions.
- [ ] Provide MFA where business or risk level requires it.

**QA should test**

- [ ] Login succeeds with valid credentials.
- [ ] Login fails safely with invalid credentials.
- [ ] Logout prevents reuse of the previous session.
- [ ] Expired reset tokens cannot be used.
- [ ] Disabled and locked accounts cannot authenticate.
- [ ] Session cookies have expected secure attributes where applicable.
- [ ] Session identifiers change after login or privilege changes where applicable.
- [ ] Password reset tokens cannot be reused.

**Common failure examples**

- Reset links work indefinitely.
- Logout removes UI state but the API session still works.
- Disabled users can still access mobile sessions.

### Authorization

| Priority | Rule |
|---|---|
| Critical | Permissions must be enforced on the server, not only by hiding UI components. |

**What should be implemented**

Authorization checks must verify user role, permission, record ownership, and endpoint access for every protected operation.

**Why it matters**

Hidden buttons do not prevent direct API calls. Broken access control can expose records or admin functions.

**Developers should**

- [ ] Enforce permissions on server endpoints.
- [ ] Verify record ownership before reading, updating, deleting, or exporting data.
- [ ] Restrict admin endpoints.
- [ ] Prevent IDOR and broken access control.
- [ ] Apply permission checks consistently to list, detail, create, update, delete, export, import, and bulk operations.
- [ ] Avoid relying on client-provided role, tenant, price, ownership, or approval values.
- [ ] Test horizontal privilege escalation between users.
- [ ] Test vertical privilege escalation between roles.

**QA should test**

- [ ] Users cannot access another user's records by changing IDs.
- [ ] Non-admin users cannot call admin APIs.
- [ ] UI-hidden actions fail when requested directly.
- [ ] Permission-denied responses are clear and safe.
- [ ] Bulk, export, search, and list endpoints return only authorised records.
- [ ] Users cannot change role, tenant, owner, approval, or price fields through tampered requests.

**Common failure examples**

- User changes `/orders/1001` to `/orders/1002` and sees another user's order.
- Admin button is hidden but endpoint accepts non-admin requests.

### Rate Limiting

| Priority | Rule |
|---|---|
| High | Apply suitable rate limits to abuse-prone and expensive operations. |

**What should be implemented**

Rate limits should apply to login, password reset, OTP, search, file upload, public API, and expensive operations. When appropriate, the expected response is `429 Too Many Requests`.

**Why it matters**

Rate limiting reduces brute-force attacks, spam, abuse, scraping, and infrastructure overload.

**Developers should**

- [ ] Define limits by user, IP, account, token, or operation as appropriate.
- [ ] Return clear retry behaviour where useful.
- [ ] Avoid revealing whether an account exists in sensitive flows.
- [ ] Monitor repeated limit violations.
- [ ] Choose limits that account for legitimate shared networks, accessibility tools, and operational users.
- [ ] Add progressive delays or lockouts only where they do not create easy denial-of-service against legitimate users.

**QA should test**

- [ ] Repeated login attempts trigger rate limits.
- [ ] Password reset and OTP resend limits work.
- [ ] Expensive searches or uploads cannot be abused.
- [ ] API returns `429 Too Many Requests` where expected.
- [ ] Legitimate retry and resend paths remain usable.

**Common failure examples**

- OTP can be requested hundreds of times.
- Search endpoint accepts rapid automated calls without throttling.

### Input Validation

| Priority | Rule |
|---|---|
| Critical | Validate input on the server even when client-side validation exists. |

**What should be implemented**

Validate required fields, length limits, numeric ranges, allowed values, file types, file sizes, dates, duplicate data, malformed input, and special characters.

**Why it matters**

Client-side validation can be bypassed. Server-side validation protects data integrity, security, and predictable behaviour.

**Developers should**

- [ ] Validate every API request on the server.
- [ ] Reject malformed payloads safely.
- [ ] Use allowlists for controlled values.
- [ ] Enforce duplicate rules in the database when needed.
- [ ] Return field-specific validation messages where practical.
- [ ] Canonicalise and normalise input before comparison where needed.
- [ ] Treat client-calculated totals, discounts, permissions, and workflow states as untrusted.
- [ ] Validate nested objects, arrays, query parameters, headers, and uploaded metadata.

**QA should test**

- [ ] Empty, invalid, duplicate, malformed, and boundary values.
- [ ] Special characters and unexpected encodings.
- [ ] Client-side validation bypass through direct API calls.
- [ ] Clear and safe validation messages.
- [ ] Nested payloads, query strings, headers, and uploaded metadata are validated.
- [ ] Client-tampered totals, permissions, and workflow states are rejected.

**Common failure examples**

- UI prevents long names, but API stores them and breaks the layout.
- Price accepts negative values through direct API calls.

### Secret Management

| Priority | Rule |
|---|---|
| Critical | Never hardcode API keys, passwords, tokens, certificates, or database credentials. |

**What should be implemented**

Secrets should be stored in environment variables or an approved secret manager, excluded from version control, rotated if exposed, and scanned in repositories and build artifacts.

**Why it matters**

Exposed secrets can lead to account compromise, data breaches, unexpected costs, and service abuse.

**Developers should**

- [ ] Use environment variables or an approved secret manager.
- [ ] Exclude `.env` and secret files from version control.
- [ ] Avoid embedding secrets in frontend bundles.
- [ ] Rotate exposed secrets immediately.
- [ ] Scan source code and build artifacts.
- [ ] Use separate credentials for development, staging, and production.
- [ ] Apply least privilege to service accounts and API tokens.
- [ ] Avoid sharing secrets through screenshots, tickets, chat, test data, or documentation.

**QA should test**

- [ ] Frontend bundles do not contain secrets.
- [ ] Repository scans do not identify credentials.
- [ ] Logs and error messages do not expose secrets.
- [ ] Staging and production do not share high-risk credentials unless formally approved.
- [ ] Service accounts have only the permissions required for their function.

**Common failure examples**

- API key committed in a config file.
- Secret included in a JavaScript bundle.
- Token printed in a deployment error.

### Error Handling

| Priority | Rule |
|---|---|
| High | Errors must help users recover without exposing internal details. |

**What should be implemented**

Show clear user-facing messages, log technical details securely, avoid leaking stack traces, database queries, file paths, tokens, or internal service details, and use appropriate HTTP status codes.

**Why it matters**

Poor error handling creates user confusion and can expose implementation details useful to attackers.

**Developers should**

- [ ] Use safe user-facing error messages.
- [ ] Log technical details securely.
- [ ] Return appropriate HTTP status codes.
- [ ] Avoid exposing stack traces and internal details.
- [ ] Provide retry or recovery paths where appropriate.
- [ ] Use correlation IDs or request IDs to connect user-facing errors with internal logs.
- [ ] Avoid exposing whether sensitive records, emails, usernames, or tokens exist unless required.

**QA should test**

- [ ] Invalid requests return safe errors.
- [ ] Server errors do not expose internals.
- [ ] Users know what to do next when recovery is possible.
- [ ] Logs contain enough detail for support without exposing sensitive data.
- [ ] Error messages provide a support reference or correlation ID where useful.
- [ ] Sensitive enumeration is not possible through different error wording or timing where relevant.

**Common failure examples**

- Production page displays a database query.
- API returns full stack trace and file path.

### Logging and Auditability

| Priority | Rule |
|---|---|
| High | Log important security, account, data, and operational events without logging sensitive secrets. |

**What should be implemented**

Log login failures, permission denials, account changes, sensitive record changes, uploads, deletions, administrative actions, and API failures.

Do not log passwords, full tokens, OTP values, or sensitive personal data unless strictly necessary and approved.

**Why it matters**

Logs support incident response, debugging, auditability, and operational monitoring.

**Developers should**

- [ ] Define important audit events.
- [ ] Include actor, action, target, time, and outcome where useful.
- [ ] Mask or omit sensitive values.
- [ ] Protect access to logs.
- [ ] Use tamper-resistant audit storage for high-risk systems where required.
- [ ] Define log retention and deletion rules.
- [ ] Include tenant, request ID, IP, device, or service identity where useful and appropriate.

**QA should test**

- [ ] Important events create expected logs.
- [ ] Sensitive values are not logged.
- [ ] Failed permission checks are visible to administrators or monitoring tools.
- [ ] Logs include enough context to investigate an incident.
- [ ] Log access is restricted to authorised personnel.

**Common failure examples**

- Password reset token appears in logs.
- Deletions cannot be traced to a user.

### File Upload Security

| Priority | Rule |
|---|---|
| Critical | File uploads must validate file type, size, storage path, execution risk, and access permissions. |

**What should be implemented**

Validate extension and MIME type, apply size limits, rename or sanitise filenames, prevent uploaded files from executing, store files outside executable paths, check ownership and access permissions, handle interrupted uploads, and remove temporary or orphaned files.

**Why it matters**

File uploads are a common source of malware, storage abuse, data leakage, and remote execution risk.

**Developers should**

- [ ] Validate extension, MIME type, size, and content where appropriate.
- [ ] Store files outside executable directories.
- [ ] Generate safe storage names.
- [ ] Enforce ownership checks for downloads and previews.
- [ ] Clean up failed and temporary uploads.
- [ ] Scan uploaded files for malware where risk, industry, or policy requires it.
- [ ] Strip or manage metadata where it may expose sensitive information.
- [ ] Serve uploaded files with safe content headers.

**QA should test**

- [ ] Invalid extensions and MIME types are rejected.
- [ ] Oversized files are rejected.
- [ ] Uploaded files cannot execute.
- [ ] Users cannot access files they do not own.
- [ ] Interrupted uploads do not leave broken records.
- [ ] File previews and downloads enforce the same permissions as file records.
- [ ] Metadata handling follows the product's privacy requirements.

**Common failure examples**

- User uploads a script renamed as an image.
- Private file can be opened with a guessed URL.

### Database and Data Integrity

| Priority | Rule |
|---|---|
| Critical | Use database constraints, transactions, pagination, and indexes to protect correctness and scalability. |

**What should be implemented**

Use constraints and transactions, prevent unintended duplicates, roll back partial operations, use pagination, add appropriate indexes, and verify cascading deletion and relationship behaviour.

**Why it matters**

UI validation alone cannot protect data integrity. Production data volume can reveal performance and consistency failures.

**Developers should**

- [ ] Add database constraints for required uniqueness and relationships.
- [ ] Use transactions for multi-step changes.
- [ ] Define cascading deletion behaviour.
- [ ] Add pagination for list endpoints.
- [ ] Review indexes for frequent queries.
- [ ] Define idempotency for payment, order, upload, invitation, and job-triggering actions where duplicate requests are possible.
- [ ] Protect migrations with rollback plans, backups, and tested data transformations.

**QA should test**

- [ ] Duplicate and invalid records cannot be created.
- [ ] Partial failures roll back correctly.
- [ ] Large lists remain usable.
- [ ] Related data is deleted, retained, or restricted as intended.
- [ ] Repeated requests do not create unintended duplicate records.
- [ ] Migration or import tests preserve required relationships and data formats.

**Common failure examples**

- Duplicate invoices created by double click.
- Failed payment creates an order without a payment record.

### Backups and Recovery

| Priority | Rule |
|---|---|
| Critical | Backups must be automated, protected, retained, and restorable. |

**What should be implemented**

Automate backups, define retention, encrypt sensitive backups, test restoration, document recovery procedures, and verify backups rather than only confirming that files exist.

**Why it matters**

A backup that cannot be restored is not reliable recovery protection.

**Developers should**

- [ ] Configure automated backups.
- [ ] Define retention rules.
- [ ] Define recovery point objective and recovery time objective for critical systems.
- [ ] Encrypt sensitive backups.
- [ ] Document recovery procedures.
- [ ] Test restoration regularly.
- [ ] Store backups separately from the primary system where appropriate.
- [ ] Include configuration, file storage, database, and required third-party dependency recovery in the plan.

**QA should test**

- [ ] Backup jobs complete successfully.
- [ ] Restore procedure works in a test environment.
- [ ] Restored data is usable and consistent.
- [ ] Failed backup alerts are triggered.
- [ ] Restore timing meets the expected recovery time objective where defined.
- [ ] Restored data freshness meets the expected recovery point objective where defined.

**Common failure examples**

- Backup file exists but cannot be imported.
- Retention deletes all usable restore points.
- Database restores but uploaded files or configuration are missing.

### Monitoring

| Priority | Rule |
|---|---|
| High | Monitor application health, dependency health, errors, traffic anomalies, storage, and backup status. |

**What should be implemented**

Health checks should cover the application, database, queues, storage, and external services. Alerts should cover failures, high error rates, abnormal traffic, low storage, and failed backups.

**Why it matters**

Teams need to know when production is failing before users or business processes are heavily affected.

**Developers should**

- [ ] Add health checks for critical dependencies.
- [ ] Configure alerts for critical failures.
- [ ] Track error rates and latency.
- [ ] Monitor storage and backup status.
- [ ] Define severity levels and escalation paths.
- [ ] Monitor background jobs, queues, scheduled tasks, and external integrations where used.

**QA should test**

- [ ] Health endpoints reflect dependency failures where appropriate.
- [ ] Alerts trigger in test scenarios.
- [ ] Monitoring dashboards show useful production signals.
- [ ] Failed jobs, queue backlogs, and integration failures are visible where applicable.
- [ ] Alert routing reaches the expected responder or channel.

**Common failure examples**

- Application is online but database is unreachable and health check still reports healthy.
- Backup fails silently for weeks.

### API and Browser Security

| Priority | Rule |
|---|---|
| High | Browser-facing and public APIs should use defensive defaults for transport, headers, cross-origin access, and request integrity. |

**What should be implemented**

Use HTTPS, secure headers, appropriate CORS restrictions, CSRF protection where browser cookie authentication is used, request size limits, and safe API versioning or deprecation behaviour.

**Why it matters**

Many security failures occur outside business logic, especially at the browser, API gateway, proxy, or integration boundary.

**Developers should**

- [ ] Enforce HTTPS in production.
- [ ] Configure security headers appropriate to the application, such as content security, framing, MIME sniffing, and referrer controls.
- [ ] Restrict CORS to approved origins and methods.
- [ ] Use CSRF protection for state-changing requests when cookie-based browser authentication is used.
- [ ] Apply request body size limits.
- [ ] Validate webhook signatures and integration callbacks where used.

**QA should test**

- [ ] Production redirects or rejects insecure HTTP as expected.
- [ ] CORS does not allow unapproved origins.
- [ ] State-changing requests include CSRF protection where applicable.
- [ ] Oversized requests are rejected safely.
- [ ] Webhooks reject missing or invalid signatures where used.

**Common failure examples**

- API allows `*` CORS with credentials.
- Webhook endpoint accepts unsigned requests.

### Dependency and Supply Chain Security

| Priority | Rule |
|---|---|
| High | Third-party dependencies, generated code, build scripts, and deployment artifacts should be reviewed for security and maintenance risk. |

**What should be implemented**

Track dependencies, patch vulnerable packages, pin or lock versions where appropriate, review license and maintenance risk through company policy, and protect build pipelines.

**Why it matters**

Modern products rely heavily on dependencies and generated code. A working feature can still introduce vulnerable packages, unsafe scripts, or unreviewed build-time behaviour.

**Developers should**

- [ ] Use dependency lock files where the ecosystem supports them.
- [ ] Run dependency vulnerability scans.
- [ ] Remove unused dependencies.
- [ ] Review packages with unusual install scripts, low trust, or unclear maintenance.
- [ ] Protect CI/CD secrets and deployment credentials.

**QA should test**

- [ ] Dependency scan results are reviewed before release.
- [ ] Build artifacts do not include unused test tools, mock data, or secrets.
- [ ] The deployed version matches the reviewed source version.

**Common failure examples**

- AI-generated code adds a package that is no longer maintained.
- Build artifact contains mock credentials or sample admin users.

## 5. Information Architecture and Visual Hierarchy

| Priority | Rule |
|---|---|
| High | Screens should make the primary task, primary information, and primary action obvious. |

**What should be implemented**

Establish clear visual hierarchy using size, weight, spacing, position, and contrast. Prioritise the information users need first. Group related elements logically. Use whitespace instead of excessive borders and divider lines. Present card content as a summary, with details available after interaction.

**Why it matters**

Users scan interfaces before reading them. If everything has equal emphasis, users cannot quickly understand what matters.

**Developers and designers should**

- [ ] Define the primary task for each screen.
- [ ] Make the primary CTA visually clear.
- [ ] Allow secondary or repeated actions to be less prominent when the workflow benefits from scanning or comparison.
- [ ] Avoid overcrowding cards and screens.
- [ ] Avoid unnecessary text links inside dense content.
- [ ] Use authentic trust signals only when relevant.
- [ ] Keep details accessible without overwhelming summary views.
- [ ] Treat decorative layout preferences as design-system choices unless they affect comprehension, accessibility, or task completion.

**QA should test**

- [ ] Users can identify the main action quickly.
- [ ] Important information appears before secondary details.
- [ ] Cards and panels do not compete for attention.
- [ ] Dense screens remain readable at common viewport sizes.
- [ ] Visual polish issues are classified by user impact rather than personal preference.

**Common failure examples**

- Every button uses the same emphasis.
- Card contains title, paragraph, badges, links, stats, and multiple actions with no clear priority.

Expensive-looking design usually comes from intentional hierarchy, spacing, typography, content structure, and consistency rather than extra decoration.

## 6. Layout, Spacing and Consistency

| Priority | Rule |
|---|---|
| High | Layouts should use consistent spacing, alignment, component patterns, and responsive behaviour. |

**What should be implemented**

Use a consistent spacing scale, align related elements consistently, prefer vertical left-aligned form layouts for readability, and maintain consistent navigation, button, icon, card, modal, and input patterns.

**Why it matters**

Consistent layout reduces cognitive load and makes products feel reliable.

**Developers and designers should**

- [ ] Use design-system spacing and radius tokens.
- [ ] Avoid irregular label and field alignment.
- [ ] Ensure nested elements visually fit within parent components.
- [ ] Avoid arbitrary "half-radius" rules as universal requirements.
- [ ] Use intentional exceptions when a component has a different function, density, or platform convention.
- [ ] Test mobile, tablet, laptop, and large screens.
- [ ] Test text expansion, translations, long names, and dynamic content.
- [ ] Prevent overflow, overlap, clipping, and unintended horizontal scrolling.

**QA should test**

- [ ] Alignment and spacing remain consistent across pages.
- [ ] Components use consistent states and dimensions.
- [ ] Long content does not break layouts.
- [ ] No unintended horizontal scrolling appears.

**Common failure examples**

- Modal buttons use a different radius and spacing from the rest of the product.
- Long usernames overlap action buttons.

## 7. Typography and Readability

| Priority | Rule |
|---|---|
| High | Typography should make interface content readable, scannable, and consistent. |

**What should be implemented**

Use readable interface fonts, limit typefaces, define typography levels for headings, body text, labels, captions, and helper text, and maintain sufficient font size and line height.

**Why it matters**

Typography hierarchy matters more than simply choosing a "premium" font. Poor type choices reduce comprehension and accessibility.

**Developers and designers should**

- [ ] Avoid decorative fonts for long text or important controls.
- [ ] Left-align long text in most cases.
- [ ] Avoid centred paragraphs for long content.
- [ ] Use centred or expressive typography only when content is short, decorative, or intentionally editorial.
- [ ] Test large text and browser zoom.
- [ ] Avoid tiny or low-contrast text.
- [ ] Use consistent heading and label styles.

**QA should test**

- [ ] Text remains readable at browser zoom.
- [ ] Long paragraphs are comfortable to read.
- [ ] Labels, captions, and helper text are legible.
- [ ] Typography hierarchy is consistent.

**Common failure examples**

- Small grey helper text contains critical instructions.
- Decorative font is used for table values or form labels.

## 8. Colour, Contrast and Dark Mode

| Priority | Rule |
|---|---|
| Critical | Colour and contrast must support readability, accessibility, and state recognition. |

**What should be implemented**

Use a limited, intentional colour palette and define semantic colours for success, warning, error, information, and neutral states. Do not rely on colour alone to communicate state. Verify accessible contrast.

**Why it matters**

Users with visual impairments, colour vision differences, or low-quality screens may miss information if colour is the only signal.

**Developers and designers should**

- [ ] Verify text, icons, focus rings, and key UI contrast.
- [ ] Use overlays, scrims, gradients, or separate text containers for text over images when needed.
- [ ] Avoid excessively saturated colours, especially in dark mode.
- [ ] Treat pure black and pure white as design choices, not automatic errors.
- [ ] Use softened neutrals where they reduce glare or improve depth.
- [ ] Ensure dark mode has clear surface hierarchy, readable text, visible borders, clear focus states, distinct disabled states, and controlled saturation.
- [ ] Use opacity-based text carefully and verify final contrast.
- [ ] Ensure decorative glow and blending effects do not reduce usability.
- [ ] Test high-contrast or forced-colours modes when the organisation's supported platforms require them.

**QA should test**

- [ ] Error, success, warning, selected, and disabled states are identifiable without colour alone.
- [ ] Contrast meets the organisation's required accessibility standard.
- [ ] Dark mode remains readable and usable.
- [ ] Text over images remains readable across image variations.
- [ ] Pure black, pure white, gradients, or saturated colours are rejected only when they fail contrast, readability, brand, or usability needs.

**Common failure examples**

- Required fields are shown only with a red border.
- Dark mode uses saturated colours that bloom or blur.
- Disabled button looks identical to enabled button.

## 9. Navigation and Icons

| Priority | Rule |
|---|---|
| High | Navigation and icons should be familiar, consistent, accessible, and predictable. |

**What should be implemented**

Use familiar navigation patterns, consistent labels and icon meanings, visible active states, logical back-navigation behaviour, visible focus indicators, and breadcrumbs where useful for deeper structures.

**Why it matters**

Navigation is how users build trust in the product's structure. Ambiguous icons and unpredictable back behaviour create confusion.

**Developers and designers should**

- [ ] Prefer icons with labels when meaning may be unclear.
- [ ] Use familiar, recognisable icons.
- [ ] Avoid ambiguous decorative icons for important actions.
- [ ] Clearly indicate the active navigation state.
- [ ] Support keyboard, touch, and assistive technologies.
- [ ] Preserve logical back-navigation behaviour.
- [ ] Avoid sending users to unrelated previous pages.

**QA should test**

- [ ] Active page or section is clear.
- [ ] Navigation works with keyboard and touch.
- [ ] Back navigation returns users to a logical previous context.
- [ ] Icons have accessible names when interactive.

**Common failure examples**

- Same icon means different actions on different pages.
- Browser back sends users out of a multi-step flow unexpectedly.

## 10. Buttons, Links and Interactive States

| Priority | Rule |
|---|---|
| High | Interactive elements must look interactive, describe their outcome, and include required states. |

**What should be implemented**

Buttons and links should have clear visual affordance, descriptive labels, appropriate hierarchy, adequate padding, touch-friendly sizes, and default, hover, focus, pressed, loading, disabled, and selected states.

**Why it matters**

Users need to know what can be clicked, what will happen, and whether an action is currently available.

**Developers and designers should**

- [ ] Use descriptive labels when outcome matters.
- [ ] Differentiate primary, secondary, tertiary, and destructive actions.
- [ ] Use appropriate confirmation for destructive actions.
- [ ] Prevent accidental double submission.
- [ ] Make links visually distinguishable.
- [ ] Avoid relying only on hover for important meaning.
- [ ] Design thumb-friendly tap areas on mobile.
- [ ] Place actions where they support the workflow, content density, and device context rather than following a universal bottom-placement rule.

**Short examples**

| Generic | Better When Outcome Matters |
|---|---|
| Submit | Save Changes |
| Submit | Create Account |
| Start | Start Assessment |
| Download | Download Report |
| Delete | Delete Account |

`Submit` is acceptable when the action is already clear, but specific labels are preferred.

**QA should test**

- [ ] Buttons show all required states.
- [ ] Disabled buttons cannot be activated.
- [ ] Loading state prevents duplicate submission.
- [ ] Destructive actions are clearly distinguished.
- [ ] Links are identifiable without hover.

**Common failure examples**

- Save button can be clicked repeatedly and creates duplicate records.
- Delete button looks like a harmless secondary action.

## 11. Forms and Data Entry

### Form Length

| Priority | Rule |
|---|---|
| Medium | Forms should ask only for necessary information and split long workflows into logical steps. |

**Developers and designers should**

- [ ] Remove unnecessary fields.
- [ ] Explain optional fields.
- [ ] Split long forms into logical steps.
- [ ] Show progress for multi-step forms.
- [ ] Preserve entered information when users move back.

**QA should test**

- [ ] Users can complete the form without unnecessary friction.
- [ ] Back navigation preserves data.
- [ ] Multi-step progress is accurate.

**Common failure examples**

- User returns to a previous step and all fields are cleared.
- Form asks for information not used by the product.

### Labels and Placeholders

| Priority | Rule |
|---|---|
| High | Use persistent labels and do not use placeholders as the only label. |

**Developers and designers should**

- [ ] Use placeholders for examples or formatting hints.
- [ ] Keep helper text visible where needed.
- [ ] Associate labels programmatically with fields.

**QA should test**

- [ ] Labels remain visible after typing.
- [ ] Screen readers announce field names.
- [ ] Helper text is available when needed.

**Common failure examples**

- Placeholder disappears and users forget what the field means.
- Screen reader announces "edit text" without a name.

### Field Types

| Priority | Rule |
|---|---|
| High | Use suitable field types and mobile keyboards for the data being entered. |

**Developers and designers should**

- [ ] Use email fields for email.
- [ ] Use telephone fields for phone numbers.
- [ ] Use numeric input for numbers where appropriate.
- [ ] Use date picker or date input for dates.
- [ ] Use password fields for passwords.
- [ ] Use OTP-specific controls where useful.

**QA should test**

- [ ] Mobile keyboards match expected input.
- [ ] Field validation matches the field purpose.
- [ ] Copy, paste, and autofill work where appropriate.

**Common failure examples**

- Phone field opens a normal text keyboard on mobile.
- Password field shows entered text by default.

### Input Masks

| Priority | Rule |
|---|---|
| Medium | Use input masks only when they help users without blocking valid input. |

**Developers and designers should**

- [ ] Avoid masks that prevent valid international input.
- [ ] Allow pasting where practical.
- [ ] Store normalised values where appropriate.
- [ ] Clearly show expected format.

**QA should test**

- [ ] Pasting works.
- [ ] International values are accepted where required.
- [ ] Stored value is normalised correctly.

**Common failure examples**

- Phone mask accepts only one country format.
- Date mask prevents users from editing the middle of the value.

### Selection Controls

| Priority | Rule |
|---|---|
| Medium | Use selection controls that match the decision type and option count. |

**Control guidance**

| Control | Use When |
|---|---|
| Radio button | User must choose one option from a short visible set. |
| Checkbox | User may choose multiple options. |
| Switch | Immediate binary setting changes state instantly. |
| Dropdown | Option list is longer or space is limited. |
| Searchable select | Option list is large. |

**Developers and designers should**

- [ ] Allow users to type and scroll when selecting from large lists.
- [ ] Avoid dropdowns for very small sets when radio buttons would be clearer.
- [ ] Avoid switches for actions that require saving later.

**QA should test**

- [ ] Control behaviour matches expected selection type.
- [ ] Keyboard navigation works.
- [ ] Large option lists are searchable or manageable.

**Common failure examples**

- Switch changes appearance but does not save immediately.
- Dropdown contains hundreds of options without search.

### Validation

| Priority | Rule |
|---|---|
| High | Validation should be clear, timely, field-specific, and preserve user input. |

**Developers and designers should**

- [ ] Show validation near the affected field.
- [ ] Preserve user input after failure.
- [ ] Validate at useful moments.
- [ ] Avoid showing every error before user interaction.
- [ ] Clearly explain how to correct the problem.
- [ ] Support boundary, invalid, empty, duplicate, and malformed inputs.

**QA should test**

- [ ] Validation messages appear near affected fields.
- [ ] Inputs are preserved after errors.
- [ ] Error messages explain correction.
- [ ] Direct API invalid submissions are rejected.

**Common failure examples**

- Form clears all fields after one validation error.
- Error says "Invalid" without explaining what is wrong.

### OTP

| Priority | Rule |
|---|---|
| High | OTP flows should support paste, correction, expiry, resend limits, and safe logging. |

**Developers and designers should**

- [ ] Support paste.
- [ ] Automatically advance between boxes where applicable.
- [ ] Allow correction.
- [ ] Handle expiry and resend limits.
- [ ] Avoid exposing OTP values in logs.
- [ ] Provide clear resend timing and status.

**QA should test**

- [ ] Full OTP paste works.
- [ ] Expired OTP is rejected.
- [ ] Resend limits work.
- [ ] OTP is not logged.

**Common failure examples**

- User cannot paste OTP from SMS.
- OTP value appears in application logs.

## 12. Search, Filters and Selection

| Priority | Rule |
|---|---|
| Medium | Search and filtering should be predictable, clear, reversible, and safe. |

**What should be implemented**

Search placeholders should describe searchable content. Results should handle no-result states, typo behaviour, partial matches, special characters, case, whitespace, active filters, clearing filters, pagination, and large result sets.

**Why it matters**

Users need to understand what they are searching and how results were produced.

**Developers and designers should**

- [ ] Clearly show active filters.
- [ ] Allow filters to be cleared.
- [ ] Keep search and filtering consistent.
- [ ] Add pagination or incremental loading for large results.
- [ ] Avoid random text that looks like an active filter when it is only a label.
- [ ] Ensure search fields do not execute unsafe input.

**QA should test**

- [ ] Typo, partial match, special character, case, and whitespace behaviour.
- [ ] No-result states.
- [ ] Filter clearing.
- [ ] Large result pagination or incremental loading.
- [ ] Unsafe input is handled safely.

**Common failure examples**

- Search placeholder says "Search" but does not explain searchable fields.
- Filter label looks like an active selected filter.

## 13. Cards and Content Components

| Priority | Rule |
|---|---|
| Medium | Cards and content components should show clear summaries without layout breakage. |

**What should be implemented**

Cards should limit content to essential summary information, keep actions clear, support missing data, and define wrapping, truncation, and expansion behaviour.

**Why it matters**

Cards become difficult to scan when overloaded. Dynamic content can easily break repeated components.

**Developers and designers should**

- [ ] Avoid excessive lines and nested actions.
- [ ] Test long titles and descriptions.
- [ ] Prevent text overlap.
- [ ] Avoid unnecessary divider lines when spacing is enough.
- [ ] Limit inline links that distract from the card's main purpose.
- [ ] Support missing images, broken images, and incomplete data.
- [ ] Maintain consistent image ratio and cropping.

**QA should test**

- [ ] Long content wraps or truncates correctly.
- [ ] Missing and broken images display acceptable fallbacks.
- [ ] Card actions are clear and reachable.
- [ ] Repeated cards remain visually consistent.

**Common failure examples**

- Long title overlaps a badge.
- Broken image leaves a collapsed card layout.

## 14. Loading, Empty, Success and Error States

| Priority | Rule |
|---|---|
| High | Every asynchronous action should have visible, accessible, and recoverable states. |

**What should be implemented**

Include initial loading, partial loading, empty state, no search results, offline state, permission-denied state, success state, recoverable error, and unexpected error where relevant.

**Why it matters**

Users need feedback that the system is working, failed, completed, or waiting for action.

**Developers and designers should**

- [ ] Use skeleton loading when it improves perceived structure.
- [ ] Use spinners for brief or indeterminate operations.
- [ ] Use inline progress, optimistic updates, disabled controls, or background status where they better match the action.
- [ ] Avoid showing skeletons for every operation by default.
- [ ] Prevent duplicate actions during loading.
- [ ] Provide retry where appropriate.
- [ ] Preserve user work when possible.
- [ ] Make status messages accessible to screen readers.

**QA should test**

- [ ] Loading states appear for slow operations.
- [ ] Empty and no-result states are clear.
- [ ] Errors provide safe recovery options.
- [ ] Duplicate actions are prevented while loading.
- [ ] Screen readers receive important status updates.
- [ ] Loading feedback type matches the duration, layout stability, and user risk of the operation.

**Common failure examples**

- User clicks Save repeatedly because there is no loading state.
- Empty dashboard looks broken instead of intentionally empty.

## 15. Modals, Confirmations and Destructive Actions

| Priority | Rule |
|---|---|
| Critical | High-impact destructive actions must clearly explain consequences and require appropriate confirmation. |

**What should be implemented**

Confirmations should state exactly what will happen, distinguish destructive and safe actions, avoid misleading button colours, trap keyboard focus inside open modals, return focus after closing, support Escape where appropriate, and avoid unnecessary modal usage.

**Why it matters**

Destructive actions can cause irreversible loss, support issues, and user distrust.

**Developers and designers should**

- [ ] Use confirmation for high-impact destructive actions.
- [ ] Explain consequences and recovery limitations.
- [ ] Clearly distinguish destructive and safe actions.
- [ ] Trap focus inside open modals.
- [ ] Return focus to the trigger after closing.
- [ ] Support Escape where appropriate.
- [ ] Avoid modals for information that does not require interruption.
- [ ] Use non-modal confirmation, undo, or delayed execution when it provides safer recovery than a blocking modal.

**QA should test**

- [ ] Destructive action confirmation cannot be bypassed through the UI.
- [ ] Keyboard focus stays inside open modal.
- [ ] Focus returns after closing.
- [ ] Account deletion explains consequences and recovery limitations.
- [ ] Alternative recovery patterns such as undo work as expected where used.

**Common failure examples**

- Delete confirmation says "Are you sure?" without naming what will be deleted.
- Modal closes and focus returns to the top of the page.

## 16. Mobile and Responsive UX

| Priority | Rule |
|---|---|
| High | Mobile and responsive layouts must preserve essential functionality, readability, and interaction quality. |

**What should be implemented**

Use adequate touch target size, avoid tiny controls, keep important actions reachable, support orientation changes when required, reflow content responsively, and ensure mobile keyboards do not cover the active field or CTA.

**Why it matters**

Many users interact on mobile devices, small screens, zoomed text, or touch input.

**Developers and designers should**

- [ ] Test one-handed use where relevant.
- [ ] Avoid placing controls behind system gestures.
- [ ] Ensure text zoom does not break layout.
- [ ] Do not hide essential features only because the screen is smaller.
- [ ] Avoid horizontal scrolling unless content genuinely requires it.
- [ ] Verify mobile keyboard behaviour.

**QA should test**

- [ ] Mobile, tablet, laptop, and large-screen layouts.
- [ ] Touch target size and spacing.
- [ ] Orientation changes where required.
- [ ] Keyboard does not cover active fields or CTAs.
- [ ] No essential feature disappears on mobile.

**Common failure examples**

- Submit button is hidden behind the mobile keyboard.
- Table creates unintended horizontal scrolling for the whole page.

## 17. Accessibility

| Priority | Rule |
|---|---|
| Critical | Core flows must be accessible through keyboard, assistive technologies, readable contrast, semantic structure, and understandable feedback. |

WCAG conformance should be evaluated against the standard required by the organisation.

**What should be implemented**

Accessibility should be considered in structure, interaction, content, error handling, media, motion, and responsive behaviour.

**Why it matters**

Accessible software is usable by more people, more robust across devices, and often easier to test and maintain.

**Developers and designers should**

- [ ] Support keyboard navigation.
- [ ] Provide visible focus indicators.
- [ ] Use semantic HTML where possible.
- [ ] Provide accessible names for controls.
- [ ] Use proper labels for fields.
- [ ] Provide meaningful alt text for informative images.
- [ ] Mark decorative images so assistive technologies can ignore them.
- [ ] Use headings in logical order.
- [ ] Maintain sufficient contrast.
- [ ] Communicate information without relying only on colour.
- [ ] Associate errors with affected fields.
- [ ] Announce important changes to screen readers.
- [ ] Support reduced-motion preferences.
- [ ] Support zoom and text resizing.
- [ ] Use adequate touch target size.
- [ ] Provide captions and transcripts for media where required.
- [ ] Avoid flashing content.
- [ ] Maintain logical reading order.
- [ ] Prefer native HTML controls before building custom controls.
- [ ] Use ARIA only when it improves semantics or interaction and is tested with assistive technologies.
- [ ] Ensure disabled, readonly, hidden, and loading states are communicated correctly.

**QA should test**

- [ ] Complete core flows using keyboard only.
- [ ] Verify labels and names with accessibility tools or screen readers.
- [ ] Check focus order and visible focus.
- [ ] Test zoom and text resizing.
- [ ] Verify contrast.
- [ ] Confirm error announcements and associations.
- [ ] Confirm reduced-motion behaviour where motion exists.
- [ ] Verify custom controls expose correct role, state, name, and value.
- [ ] Confirm decorative images are ignored and informative images have useful alternatives.

**Common failure examples**

- Custom dropdown cannot be opened with keyboard.
- Error message appears visually but is not associated with the field.
- Focus indicator is removed globally.

## 18. Performance and Perceived Performance

| Priority | Rule |
|---|---|
| High | Products should remain responsive under realistic data, network, and device conditions. |

**What should be implemented**

Optimise images and fonts, lazy-load suitable assets, avoid large blocking scripts, prevent layout shift, use pagination or virtualisation for large data, debounce expensive searches where appropriate, and provide immediate interaction feedback.

**Why it matters**

Performance affects conversion, trust, accessibility, operational cost, and user satisfaction.

**Developers should**

- [ ] Optimise large images and media.
- [ ] Limit render-blocking scripts and fonts.
- [ ] Prevent layout shift.
- [ ] Use pagination or virtualisation for large lists.
- [ ] Debounce expensive searches where appropriate.
- [ ] Avoid visual effects that cause poor performance.
- [ ] Test with realistic production-size data.
- [ ] Define performance budgets for key pages or flows where practical.
- [ ] Cache data and assets intentionally, with invalidation rules where stale data would harm users.
- [ ] Avoid blocking core interactions on non-critical analytics or third-party scripts.

**QA should test**

- [ ] Slow network behaviour.
- [ ] Lower-powered devices.
- [ ] Large data volumes.
- [ ] Repeated interactions.
- [ ] API latency and loading feedback.
- [ ] Layout stability during loading.
- [ ] Key pages or flows meet defined performance budgets where they exist.
- [ ] Cached content updates correctly when source data changes.

**Common failure examples**

- Page works with ten records but freezes with ten thousand.
- Search sends a request on every keystroke without debounce or cancellation.

## 19. Responsive Content and Internationalisation

| Priority | Rule |
|---|---|
| Medium | Interfaces should support content expansion, localisation, and locale-specific formats where required. |

**What should be implemented**

Test translated text, longer labels and values, locale-specific dates, times, numbers, currencies, names, and addresses. Avoid embedding text inside images. Verify right-to-left support if required.

**Why it matters**

Text length and formatting vary widely across languages and regions. Hardcoded assumptions cause layout and data-entry failures.

**Developers and designers should**

- [ ] Avoid hardcoded widths that break when text expands.
- [ ] Use locale-aware formatting for dates, times, numbers, and currencies.
- [ ] Support flexible names and addresses.
- [ ] Maintain subject, product, and brand naming rules consistently.
- [ ] Verify right-to-left support where required.

**QA should test**

- [ ] Longer translated labels.
- [ ] Long names, addresses, and values.
- [ ] Locale-specific date, time, number, and currency formats.
- [ ] Right-to-left layout where required.
- [ ] Text does not appear embedded in images when translation is needed.

**Common failure examples**

- Button text clips after translation.
- Date format is ambiguous for target users.

## 20. Design System and Component Quality

| Priority | Rule |
|---|---|
| Medium | Reusable components and design tokens should support consistency, accessibility, and maintainability. |

**What should be implemented**

Define reusable tokens for colour, typography, spacing, radius, shadows, breakpoints, and motion. Build reusable components with documented variants and states.

**Why it matters**

One-off styles and inconsistent components make products harder to scale, test, and maintain.

**Developers and designers should**

- [ ] Use shared tokens instead of arbitrary values.
- [ ] Build reusable components.
- [ ] Document variants and states.
- [ ] Avoid one-off styles unless justified.
- [ ] Keep icons and components consistent.
- [ ] Include accessibility requirements in component definitions.
- [ ] Add visual regression testing where practical.

**QA should test**

- [ ] Component variants behave consistently.
- [ ] States are implemented across component usage.
- [ ] Accessibility is preserved in reusable components.
- [ ] Visual regression checks cover critical components where practical.

**Common failure examples**

- Three different modal styles exist in the same product.
- Button component supports focus state, but one-off buttons do not.

## 21. QA Testing Instructions

QA should test every category using functional, UI, accessibility, API/security, and performance perspectives. These test types should be converted into project-specific test cases.

Each release checklist item should include evidence where practical: environment tested, build or commit version, test data used, device or browser, result, defect link, owner, and approval status. A checkbox alone is useful for quick review, but company release sign-off should keep enough detail to prove what was tested and what risk was accepted.

**Suggested test status values**

| Status | Meaning |
|---|---|
| Pass | Requirement was verified successfully in the intended environment. |
| Fail | Requirement did not meet expected behaviour and needs a defect or fix. |
| Not Applicable | Requirement does not apply to this product, feature, or release scope. |
| Blocked | QA could not verify because of missing access, environment failure, missing data, or unresolved dependency. |
| Accepted Risk | Issue remains open with documented impact, workaround, owner, target date, and approval. |

### Functional Testing

- [ ] Valid flow.
- [ ] Invalid flow.
- [ ] Boundary values.
- [ ] Required and optional fields.
- [ ] State transitions.
- [ ] Repeated actions.
- [ ] Back navigation.
- [ ] Refresh behaviour.
- [ ] Session behaviour.

### UI Testing

- [ ] Alignment.
- [ ] Spacing.
- [ ] Typography.
- [ ] Contrast.
- [ ] Overflow.
- [ ] Responsiveness.
- [ ] Hover, focus, pressed, disabled, and loading states.
- [ ] Long content.
- [ ] Empty content.
- [ ] Localisation.

### Accessibility Testing

- [ ] Keyboard-only flow.
- [ ] Screen-reader labelling.
- [ ] Zoom.
- [ ] Focus order.
- [ ] Contrast.
- [ ] Reduced motion.
- [ ] Error announcements.

### API and Security Testing

- [ ] Direct API requests.
- [ ] Missing and invalid authentication.
- [ ] Permission boundaries.
- [ ] Record ownership.
- [ ] Rate limiting.
- [ ] Malformed payloads.
- [ ] Sensitive response data.
- [ ] Error leakage.
- [ ] File upload validation.

### Performance Testing

- [ ] Concurrent users.
- [ ] Repeated requests.
- [ ] Realistic data volume.
- [ ] Slow network.
- [ ] Large files.
- [ ] API latency.
- [ ] Database growth.
- [ ] Defined performance budgets where applicable.
- [ ] Cache freshness and invalidation where applicable.

## 22. Developer Implementation Checklist

- [ ] Requirements documented.
- [ ] Business rules confirmed.
- [ ] Threat model or risk review completed for sensitive flows.
- [ ] Validation implemented server-side.
- [ ] Authentication implemented.
- [ ] Authorization implemented.
- [ ] Rate limiting configured.
- [ ] Secrets protected.
- [ ] Dependency and build artifact scans reviewed.
- [ ] Logs added.
- [ ] Sensitive data excluded from logs.
- [ ] Loading, error, and empty states implemented.
- [ ] Accessibility reviewed.
- [ ] Responsive layout tested.
- [ ] Browser compatibility checked.
- [ ] Database constraints added.
- [ ] Indexes reviewed.
- [ ] File validation added.
- [ ] Backups configured.
- [ ] Recovery point and recovery time expectations defined where required.
- [ ] Restore tested.
- [ ] Monitoring configured.
- [ ] Privacy and terms reviewed.
- [ ] Consent behaviour reviewed where tracking is used.
- [ ] Test data, mock data, and placeholder content removed from production paths.
- [ ] Production environment tested.

## 23. QA Pre-Release Checklist

Use this checklist with status, evidence, owner, and defect references when preparing a release decision.

| Area | QA Verification | Status | Evidence / Notes |
|---|---|---|---|
| Critical business flows | Core user and admin flows work from start to finish. |  |  |
| Negative tests | Invalid, malformed, duplicate, unauthorised, and boundary cases are covered. |  |  |
| Access control | Role, permission, ownership, tenant, admin, export, and bulk operation boundaries are verified. |  |  |
| Authentication | Login, logout, session expiry, reset, disabled accounts, locked accounts, and MFA where used are verified. |  |  |
| API validation | Direct API requests reject invalid payloads, client-tampered values, and unsafe input. |  |  |
| Rate limits | Abuse-prone flows return expected throttling while legitimate retries remain usable. |  |  |
| File uploads | Type, size, metadata, interruption, preview, download, execution, and ownership rules are verified. |  |  |
| Data integrity | Constraints, transactions, idempotency, imports, migrations, duplicate prevention, and deletion behaviour are verified. |  |  |
| Forms | Labels, field types, validation, masks, selection controls, OTP, back navigation, and saved progress are verified. |  |  |
| Mobile | Touch targets, keyboard coverage, responsive reflow, orientation, zoom, and essential features are verified. |  |  |
| Browsers | Supported browsers and device classes are tested against the release support matrix. |  |  |
| Accessibility | Keyboard flow, focus, labels, names, contrast, zoom, announcements, reduced motion, and custom controls are verified. |  |  |
| Error handling | User-facing errors are useful and internal details are not exposed. |  |  |
| Loading states | Slow, partial, empty, success, offline, permission-denied, recoverable error, and unexpected error states are verified where relevant. |  |  |
| Privacy links | Privacy Policy and Terms links are visible, accessible, correct, and production-ready. |  |  |
| Consent | Consent choices, rejection, preferences, withdrawal, persistence, and tracker blocking are verified where required. |  |  |
| Logging | Required events are logged and sensitive values are excluded. |  |  |
| Performance | Realistic data, slow network, lower-powered devices, repeated requests, budgets, caching, and API latency are tested. |  |  |
| Deployment | Build version, environment variables, migrations, seed data, feature flags, and production configuration are verified. |  |  |
| Backup and recovery | Backup completion, restore test, data consistency, file/config recovery, RPO/RTO, and failed-backup alerts are verified. |  |  |

## 24. Test Case Traceability Matrix

| ID | Category | Requirement / Rule | Developer Implementation | QA Verification | Priority |
|---|---|---|---|---|---|
| QA-001 | Privacy | Privacy Policy is available when personal data is collected. | Add linked policy pages and consistent privacy references. | Verify visibility, accessibility, link validity, and consistency. | Critical |
| QA-002 | Privacy | Cookie consent controls non-essential tracking where required. | Block non-essential trackers before consent and store preferences. | Confirm trackers do not load before consent and preferences persist. | Critical |
| QA-003 | Security | Authorization is enforced on the server. | Check role, permission, ownership, and endpoint access server-side. | Attempt horizontal and vertical privilege escalation through APIs. | Critical |
| QA-004 | Security | Rate limits protect abuse-prone operations. | Configure limits for login, reset, OTP, search, upload, and APIs. | Trigger limits and verify `429 Too Many Requests` where expected. | High |
| QA-005 | Security | Secrets are not hardcoded or exposed. | Use environment variables or secret manager and exclude secret files. | Scan repository, build artifacts, logs, and frontend bundles. | Critical |
| QA-006 | Validation | Server validates all submitted data. | Validate required fields, ranges, allowed values, duplicates, and malformed input. | Submit invalid data through UI and direct API requests. | Critical |
| QA-007 | Errors | Errors are safe and useful. | Show user-safe messages and log technical details securely. | Verify no stack traces, file paths, queries, or tokens are exposed. | High |
| QA-008 | Logging | Important events are logged without sensitive values. | Log account, permission, data, upload, deletion, admin, and API events. | Confirm expected logs exist and passwords, OTPs, and full tokens are absent. | High |
| QA-009 | File Upload | Uploads validate type, size, storage, and ownership. | Validate files, sanitise names, restrict execution, and enforce access. | Test invalid files, oversized files, interrupted uploads, and unauthorised access. | Critical |
| QA-010 | Recovery | Backups are automated and restorable. | Configure backup, retention, encryption, and documented restore steps. | Perform restore test and verify data consistency. | Critical |
| QA-011 | Recovery | Recovery targets are defined where required. | Define recovery point and recovery time objectives for critical systems. | Verify restore timing and restored data freshness against targets. | Critical |
| QA-012 | API Security | Browser and public API boundaries are protected. | Enforce HTTPS, security headers, CORS restrictions, CSRF where applicable, request limits, and webhook signatures. | Test insecure HTTP, unapproved origins, missing CSRF, oversized requests, and invalid webhook signatures. | High |
| QA-013 | Supply Chain | Dependencies and build artifacts are reviewed. | Use lock files, run vulnerability scans, remove unused packages, and protect CI/CD credentials. | Review scan results and confirm deployed artifact matches reviewed source. | High |
| QA-014 | UI/UX | Visual hierarchy makes primary task and CTA clear. | Use intentional size, weight, spacing, position, and contrast. | Review whether primary action and information are obvious. | High |
| QA-015 | Forms | Fields use persistent labels. | Add visible labels and programmatic label associations. | Verify labels remain visible and screen readers announce field names. | High |
| QA-016 | Forms | Input masks help without blocking valid input. | Allow paste, international formats where required, and normalised storage. | Test paste, correction, and valid international values. | Medium |
| QA-017 | Forms | Selection controls match choice type and list size. | Use radio, checkbox, switch, dropdown, or searchable select appropriately. | Verify expected behaviour, keyboard access, and large-list usability. | Medium |
| QA-018 | Forms | Long forms are split and preserve progress. | Group steps, show progress, and persist entered values. | Move forward and back and verify data is retained. | Medium |
| QA-019 | Search | Search and filters are clear, safe, and reversible. | Show active filters, clear controls, no-result states, and pagination. | Test typo, partial, case, whitespace, special characters, and clearing. | Medium |
| QA-020 | Feedback | Loading, empty, success, and error states exist. | Add visible states and prevent duplicate actions during loading. | Test slow operations, empty data, failures, retries, and screen-reader status. | High |
| QA-021 | Responsive | Layout works across screen sizes. | Use responsive constraints and avoid unintended horizontal scrolling. | Test mobile, tablet, laptop, large screen, zoom, and long content. | High |
| QA-022 | Colour | Dark mode remains readable and structured. | Define dark surfaces, borders, focus, disabled states, and controlled saturation. | Verify dark mode contrast, hierarchy, and state visibility. | High |
| QA-023 | Accessibility | Core flows work by keyboard. | Implement logical focus order and keyboard handlers for custom controls. | Complete core flows without a mouse and verify focus visibility. | Critical |
| QA-024 | Accessibility | Contrast meets required standard. | Select accessible colours and verify final rendered contrast. | Test text, controls, disabled states, focus indicators, and image overlays. | Critical |
| QA-025 | Accessibility | Custom controls expose correct semantics. | Prefer native controls and use ARIA only when needed and tested. | Verify role, state, name, value, focus, and keyboard behaviour. | High |
| QA-026 | Mobile | Touch targets are usable. | Provide adequate size and spacing for touch controls. | Test one-handed use, mobile tap accuracy, and spacing. | High |
| QA-027 | Safety | Destructive actions require clear confirmation or safer recovery. | Add consequence-specific confirmation, undo, delayed execution, or safe/destructive button distinction as appropriate. | Verify confirmation copy, recovery behaviour, focus management, cancellation, and API protection. | Critical |
| QA-028 | Performance | Product handles realistic load and data volume. | Optimise assets, paginate large data, debounce expensive operations, and reduce blocking work. | Test slow network, lower-powered devices, repeated requests, and production-size data. | High |
| QA-029 | Performance | Performance budgets and caching rules are followed where defined. | Define budgets, cache intentionally, and avoid blocking core flows on non-critical third parties. | Verify budget results and cache invalidation behaviour. | Medium |
| QA-030 | Internationalisation | Content supports localisation and expansion. | Use flexible layouts and locale-aware formatting. | Test translated labels, long names, dates, currencies, and RTL where required. | Medium |

## 25. Common Vibe-Coding Failure Patterns

Rapid AI-assisted development can produce impressive demos while missing production requirements. Reviewers should watch for these patterns:

| Failure Pattern | Why It Is Risky | What To Check |
|---|---|---|
| Only testing the happy path | Real users make mistakes, lose network, refresh pages, and enter unexpected data. | Test invalid flows, retries, refreshes, back navigation, and boundary values. |
| Trusting frontend validation | Client-side rules can be bypassed. | Send direct API requests with invalid payloads. |
| Hiding buttons instead of enforcing permissions | Hidden UI does not prevent unauthorised API calls. | Test direct endpoint access across roles and owners. |
| Exposing secrets | Keys and tokens can be copied and abused. | Scan source, logs, environment files, and frontend bundles. |
| Missing loading and error states | Users cannot tell whether the product is working or broken. | Test slow requests, failures, empty data, and retries. |
| Using fake or placeholder data in production | Users may see misleading or unverified content. | Verify production data sources and remove placeholders. |
| Missing responsive behaviour | Product may be unusable on common devices. | Test mobile, tablet, laptop, large screens, zoom, and long content. |
| No accessibility | Users with disabilities may be blocked from core flows. | Test keyboard, labels, focus, contrast, zoom, and announcements. |
| No logs | Support and incident response become difficult. | Verify key events are logged safely. |
| No rate limiting | Abuse and brute force attempts are easier. | Trigger repeated sensitive or expensive operations. |
| No backup restore test | Backups may be unusable during an incident. | Restore backup into a test environment. |
| No production data-volume testing | Small demo data hides performance and layout issues. | Test with realistic record counts and file sizes. |
| Accepting AI-generated code without review | Generated code may be insecure, inconsistent, or incomplete. | Review logic, tests, dependencies, permissions, and edge cases. |
| Adding inconsistent components | Product becomes harder to maintain and less trustworthy. | Compare new UI to design-system tokens and existing patterns. |
| Ignoring browser and device differences | Behaviour may fail outside the developer's setup. | Test supported browsers, devices, input methods, and screen sizes. |
| Using legal templates without company review | Templates may not match jurisdiction, company policy, or actual data use. | Route legal, privacy, and compliance materials to qualified reviewers. |

## 26. Final Production Readiness Gate

### Must Pass Before Production

- [ ] Authentication protects credentials, sessions, reset flows, disabled accounts, and logout.
- [ ] Authorization is enforced server-side for roles, permissions, ownership, and admin endpoints.
- [ ] Personal data is collected only when needed and protected in storage, transit, logs, URLs, and responses.
- [ ] Privacy, consent, and terms requirements are reviewed against applicable laws and company policies.
- [ ] Server-side validation protects required fields, allowed values, ranges, malformed input, duplicates, and files.
- [ ] Secrets are stored safely, excluded from version control, and absent from frontend bundles.
- [ ] Browser and API security controls are configured for HTTPS, headers, CORS, CSRF where applicable, request limits, and signed integrations where used.
- [ ] Error handling does not expose stack traces, tokens, queries, file paths, or internal service details.
- [ ] Critical logs exist and sensitive values are excluded.
- [ ] Database constraints, transactions, duplicate prevention, and relationship behaviour are verified.
- [ ] Backups are automated, protected, retained, and successfully restored in a test with file, configuration, and database recovery considered.
- [ ] Critical accessibility requirements are met for keyboard access, focus, labels, contrast, and error handling.
- [ ] High-impact destructive actions require clear confirmation and cannot be bypassed improperly.
- [ ] Open Critical issues have either been fixed or formally accepted with documented owner, impact, workaround, target date, and approval.

### Should Pass Before General Release

- [ ] Responsive design works on mobile, tablet, laptop, and large screens.
- [ ] Supported browsers are tested.
- [ ] Performance is acceptable on realistic data, slow networks, and lower-powered devices.
- [ ] Dependency and build artifact scans have been reviewed.
- [ ] Monitoring and alerts cover application, database, queues, storage, external services, errors, storage, and backups.
- [ ] Loading, empty, success, permission-denied, offline, recoverable error, and unexpected error states are implemented where relevant.
- [ ] UI hierarchy, spacing, typography, and component consistency are reviewed.
- [ ] Search, filters, forms, selections, and navigation behave predictably.
- [ ] Localisation, content expansion, and locale formatting are tested where required.
- [ ] High-priority issues have an agreed fix or accepted-risk decision.

### Can Be Improved Iteratively

- [ ] Advanced animations.
- [ ] Decorative visual effects.
- [ ] Optional personalisation.
- [ ] Non-critical visual refinements.
- [ ] Additional convenience shortcuts.
- [ ] Expanded visual regression coverage.
- [ ] More detailed component documentation.
- [ ] Aesthetic preferences that do not affect usability, accessibility, trust, brand requirements, or core workflows.

"A working demo proves that a feature can run. Production readiness proves that it can be used safely, correctly, accessibly, and reliably by real users."
