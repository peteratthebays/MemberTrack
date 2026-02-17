My answers have a "#" in front of them.

Entities & Data Model
DONMAN migration — Is the DONMAN # just a reference to keep for historical lookup, or does this app need to integrate with DONMAN ongoing? Same question for the Mailchimp name field — is there active Mailchimp integration, or is this just a data migration artifact?

# Donman is our member management system. This ID is a reference to the ID of the person. Integration is out of scope for this exercise.

Couple memberships — When Type is "Couple", there's a Connected Name linking two people. Are both people full member records with their own DONMAN #? Should the system model this as two Members linked together, or as one Membership with a primary and secondary member?

# Couple memberships should link t\wo people together. Each person has a separate record, but they are linked via the membership. We need to know which people are linked to which others. There are also Family memberships too which allow two parents and dependant kids. There may be rules about kid elligibility - I am not sure.

Member vs Membership — Should these be separate entities? e.g., a Member (person) can have a Membership that changes over time (type, status, renewal). Or is a member record essentially a flat row like the sample data?

# Yes, separate. These are tracked in a single line currently, but it would be better to maintain a membership history.

Membership types — I see two type fields:

Type (Single, Couple) — seems to describe the membership tier
Type2 (Community, Life, Volunteer, Ex Board) — seems to describe the member's category
Are these the complete lists of values for each? Are they fixed or should they be configurable (admin-managed lookup tables)?

# Pay Type - Auto, Annual, Not applicable
# Status - Active, Non-Active
# Type - Single, Couple, Family
# Rights - Paid, Associate, Voting Rights
# Type 2 - Community, Life, Volunteer, Ex-Board, Board, Doctor, Family, Staff
# Renewal Status - Not Renewing, Renewed, New, Overdue, To renew

Rights (Paid, Associate, Voting Rights) — Is this a fixed set? What do these mean operationally — do they control what the user can do in the app, or is it just informational?

# Just informational

Status (Active, Non Active) and Renewal Status (Renewed, Not Renewing) — Are these manually set by a user, or derived from business rules (e.g., auto-set to Non Active if renewal date passes)?

# Currently manually set, but there may be time - dependant values. For example, they should be set to "to-renew" coming up to renewal date etc. Basiclaly, allow for rules to set these and we can work out what the rules are later.

Payment tracking — Pay type has ANNUAL, AUTO, and Not Applicable. Does the app need to track payment history (dates, amounts, method), or just the current payment status and last paid date?

# Currently no.

Address — The sample has a single address string. Should this be broken into structured fields (street, suburb, state, postcode), or kept as a single freetext field?

# Split into structured fields. Optional - integrate into an autocompletion service for these.

EPAS — What is this? The field "Update EPAS" has values like "deleted" and "Not Applicable". Is this an external system that needs integration, or a flag to track?

# That's our patient admin system. Not sure how this is used. Preserve manual fields for now.

Org/Foundation — This column is empty in all samples. Is it still needed? What does it represent?

# Add the field in the database, do not include in the UI.

Notes — Free text per member? Any need for a notes history (multiple notes with timestamps), or just a single notes field?

# Just a single note is ok for now.

Pages & Features
Primary workflows — What are the main things a user does day-to-day? e.g.:

Look up a member by name
Process renewals
Update member details
Add new members
Generate reports/exports
Search and filtering — What fields do users typically search/filter by? Name, status, membership type, renewal status?

# Yes, all of these. Running reports, looking for members we are trying to renew, or chasing up people who have not renewed.

Bulk operations — Any need for bulk actions like "mark all overdue members as Non Active" or "export to CSV"?
# Yes, it would be good to be able to filter by status, including date ranges, and then check uncheck the results, and apply. e.g. Search for all members with expired memberships for more than three months, and then change them to archived or something.

Reporting/dashboard — Do you need a dashboard (e.g., total active members, renewals due this month, revenue), or is this handled by Power BI via the data warehouse?

# Yes, please include a sample of reports on a reporting dashboard. We can include more later.

User Roles & Access
Who uses this app? — Is it one team with equal access, or are there roles (admin, read-only, data entry)?

# Allow for multiple roles, but initially we will put everyone in the same role. I may restrict bulk edits etc to specific groups.

Which Entra ID groups/roles should map to app permissions, if any?

# yes - b4808399-e821-47a3-a56a-3fcd8f203b4d is the general access group. Right now just allow access for this group and deny others.


Technical
Database — Is there an existing SQL Server instance and database name to target, or should I scaffold for a new database? What's the server address (e.g., localhost, a named instance, or a network server)?

# For now, please use the localdb for testing. I will migrate to production when we're done.

Data migration — Will you need an import feature to load existing DONMAN data (e.g., CSV upload), or will that be handled outside the app?

# Yes, I need import and export CSV option. It should read and import what it can, flag exceptions and allow the user to manage these to get them in, and prevent duplicated (based on donman id) being entered. There should also be an export to CSV option.

Entra ID app registrations — Are these already created, or should I scaffold with placeholder values for now?
# Scaffold for now. I need to create.

A requirements doc covering these points would give me enough to scaffold the full application in one pass — backend entities, migrations, controllers, DTOs, frontend pages, services, and routing.

# this is it!


# one more thing, I want to run a local change management for this app. I'd like a "tracking.md" file which contains "current" "backlog" "bugs". Each of these can link to details further down if relevant, but just headers for most of them. You can create this at the end of the dev with tasks that need to be completed, such as the app registration, production deployment or anything else.
