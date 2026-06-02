# Security Specification: Team Survey Portal Firestore Security

This document outlines the security architecture and invariants of the Firestore database for the Team Survey Portal, utilizing Attribute-Based Access Control (ABAC) and dynamic field validation.

## 1. Data Invariants

1. **Team Invariant**: A team cannot be created without a unique `id`, a non-empty `name`, and valid lists for `memberEmails` and `teamAdminEmails`.
2. **Submission Invariant**: A survey submission must map to a valid `teamId`. The `userEmail` must exactly match the authenticated user's email.
3. **Immutable Identity**: Submissions are immutable once created; users cannot modify their historical survey answers or change their associated user email.
4. **Access Relational Invariant**: Users can only list and read submissions of a team if they are explicitly in the `allowedViewerEmails` list or are the global system administrator.

## 2. The "Dirty Dozen" Malicious Payloads

The following malicious writes must be blocked by the security rules:

1. **Anonymous Team Injection**: Creating a team without being authenticated.
2. **Identity Spoofing**: Submitting a survey under another user's email address.
3. **Privilege Escalation**: Attempting to make oneself a team admin without authorization.
4. **ID Poisoning**: Injecting an extremely long string (>128 chars) as a `teamId` or `submissionId` to cause denial of wallet.
5. **Orphaned Submission**: Submitting a survey with a non-existent `teamId`.
6. **Self-Promotion to Global Admin**: Attempting to create an admin configuration document or bypass email checks.
7. **Completeness Bypass (Empty Scores)**: Submitting a survey response with empty or malformed answers.
8. **Shadow Field Injection**: Injecting extra unvalidated fields (e.g., `isVerifiedBySystem: true`).
9. **Survey Deletion**: A standard team member attempting to delete their or someone else's submission.
10. **Global Team Scraping**: An authenticated user attempting to list teams they do not belong to.
11. **Historical State Tampering**: Modifying the `submittedAt` timestamp of a past submission.
12. **Status Bypass**: A member overriding the `dashboardActive` state of a team without being team admin.

## 3. Rules Implementation and Testing Specs

The rules are built around exact schemas, relational viewers, and the following core principles:
- **Default-Deny Catch-All**
- **Strict Keys and Size Enforcements**
- **No Blanket Lists (Query Enforcer checks `allowedViewerEmails`)**
- **Immutable Fields protection (`submittedAt`, `userEmail`)**
- **Temporal integrity using `request.time`**
