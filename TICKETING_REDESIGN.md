# Ticketing Tool Redesign Audit

## Executive Summary

The app is already close to a plain internal tool visually, but the product structure is not disciplined enough for a serious ticketing system.

The current UI behaves like a workspace portal with many equal-weight modules. A ticketing product should do the opposite:

- tickets should be the default home
- ticket list and ticket detail should dominate the experience
- project/admin/reporting surfaces should support ticket work, not compete with it
- low-frequency configuration should move out of the daily navigation path

The current problem is not "it looks too fancy". The real problem is that too many workflows are first-class at the same time.

## What Is Working

- The visual language is already restrained and mostly aligned with an internal tool.
- Shared page primitives such as `PageHeader`, `EntityPageLayout`, `FilterBar`, and table shells are directionally correct.
- Tailwind usage is mostly standard and implementation-friendly.

Do not restart the visual system. Simplify the product structure and tighten component rules.

## Brutal Critique

### 1. The app is not behaving like a ticketing product

The sidebar gives equal prominence to Dashboard, Projects, Assets, Clockify, Tickets, Report, Settings, Workspace, pinned projects, shortcuts, notifications, and version info. That is too much parallel navigation for a system that should be centered on work tracking.

Result:

- the information architecture feels like an operations portal
- users must decide where work lives before they can do work
- the navigation exposes too many low-frequency destinations

### 2. The dashboard is unnecessary

The dashboard is a grid of jump cards. In a ticketing system, that is usually wasted space and an extra click. Users should land on a work queue, not a menu of modules.

### 3. The tickets page is overloaded

The tickets screen is trying to be:

- a ticket list
- a kanban board
- a gantt planner
- an epic creation entry point
- a sprint creation entry point
- a sharable filtered report
- a workflow engine with status-reason dialogs

That is too much for one primary screen. The page is operationally powerful, but cognitively noisy.

### 4. The main ticket table is too weak for the importance of the screen

The default list view is missing some of the highest-value scan information:

- project
- updated time
- due date
- labels/epic/sprint in a compact way
- quick actions or row state cues

At the same time, the table keeps several columns that are lower value for first-pass scanning. The result is that the screen has many controls around the list, but the list itself is not doing enough.

### 5. Ticket detail prioritizes utility controls over issue comprehension

The ticket detail header gives early space to copy/share controls, while the core hierarchy of ticket title, project, status, assignee, due date, and discussion is fragmented across header, body, sidebar, and footer.

The page is functional, but not calm. It feels like multiple panels assembled together rather than one coherent issue page.

### 6. Projects are carrying too much metadata in the list

Projects currently behave like a wide admin table with many columns. That is fine for raw CRUD, but not for a ticketing-first product. Projects should mostly answer:

- what is this project
- who owns it
- what is its status
- how much work is open
- how do I open its tickets

Everything else should be secondary.

### 7. Assets are not a top-level peer of Tickets

Unless assets are core daily workflow, they should not compete with tickets in primary navigation. Right now they read as another first-class product area.

### 8. Admin is scattered

Users, Roles, Deleted Tickets, Workspace Status, Epic, Sprint are split across separate pages and sidebar groups. This makes admin feel broader than ticket execution.

It should become one `Settings` area with clear sections.

### 9. The role editor is technically useful but UX-heavy

The permission matrix is dense and raw. That is acceptable for advanced admins, but it should live in a contained settings surface, not feel like a normal app page.

### 10. There are too many small utility affordances in primary surfaces

Examples:

- shortcuts button in sidebar
- version indicator in sidebar
- pinned project tree in sidebar
- share button in ticket toolbar
- multiple create buttons on the tickets page
- copy URL and hyperlink actions in ticket detail header

None of these are individually terrible. Together, they dilute the product.

## Product Direction

Reframe the app as:

`A ticketing system with supporting project setup and operational reporting`

Not:

`A workspace with many equal modules`

## Proposed Information Architecture

### Primary Navigation

Keep only:

- `Tickets`
- `Projects`
- `Reports` if used daily, otherwise move under `Settings` or `Operations`
- `Settings`

Optional:

- `My Work` as a saved ticket view, not a separate product area

Remove from primary nav:

- `Dashboard`
- `Assets`
- `Clockify`
- `Pinned Projects`
- `Workspace`
- `Deleted Tickets`

Rehome:

- `Assets` under `Projects` or `Settings`, depending on actual usage
- `Clockify` under `Reports` or `Settings > Integrations`
- `Workspace` sections under `Settings > Workflow`
- `Deleted Tickets` under `Settings > Data`

## Page-by-Page Layout Recommendation

### 1. Sign In

Keep it plain.

Layout:

- centered card
- product name
- one OAuth button
- one short error message area

Remove:

- any copy that implies email/password when Google is the only action

### 2. Default Landing Page

Replace Dashboard with `Tickets`.

If leadership insists on a landing page, make it a compact work overview:

- Assigned to me
- Mentioned recently
- Overdue
- Waiting on review

No card grid of modules.

### 3. Tickets List Page

This should be the strongest page in the product.

Recommended structure:

1. Top bar
   - page title
   - primary action: `Create ticket`
   - optional secondary action: saved views menu
2. Search and quick filters row
   - search
   - project
   - assignee
   - status
   - more filters button
3. View tabs
   - `List`
   - `Board`
   - optional `Timeline` only inside a project context
4. Main content
   - dense table by default
   - optional right-side preview panel on desktop

Default table columns:

- ID
- Title
- Status
- Priority
- Assignee
- Project
- Updated
- Due date

Optional secondary columns behind customization:

- Requester
- Sprint
- Epic
- SQA assignee

Rules:

- make `List` the default and primary view
- keep `Board` as a secondary visualization
- remove `Gantt` from the global default view toggle
- only show timeline/gantt inside a specific project where planning context exists
- do not surface epic/sprint creation beside ticket creation in the main toolbar

### 4. Ticket Detail Page

Recommended structure:

1. Header
   - breadcrumb back to ticket list or project
   - ticket ID
   - title
   - status
   - assignee
   - primary actions menu
2. Main content
   - description
   - comments/activity in tabs or a stacked discussion area
3. Right metadata sidebar
   - project
   - priority
   - requester
   - due date
   - sprint
   - epic
   - parent/subtask
   - timestamps inside a collapsible advanced section

Rules:

- move copy/share actions into an overflow menu
- remove the persistent footer action bar
- keep destructive actions in the overflow menu or a secondary section
- keep comments and activity prominent; they are core issue work, not secondary metadata
- reserve advanced timestamps for power users, collapsed by default

### 5. Projects List

Projects should become a routing and organizational page, not a giant metadata sheet.

Recommended list columns:

- Project name
- Lead
- Status
- Open tickets
- Updated

Optional:

- Department
- Require SQA

Open the project into a project detail page with tabs:

- `Tickets`
- `Board`
- `Overview`
- `Settings`

Do not make users manage every project field from the list.

### 6. Project Detail

This should become the place for project-scoped planning.

Recommended layout:

- header with project name, status, owners
- tabs:
  - `Tickets`
  - `Board`
  - `Timeline`
  - `Settings`

Important:

- epic and sprint creation should live here, not on the global tickets page
- project settings should include requesters, collaborators, links, workflow flags

### 7. Assets

If assets are genuinely needed:

- move under project context or settings
- keep as a simple reference table
- remove avatar-heavy collaborator presentation from the main list unless it adds daily value

If assets are not used daily:

- treat this as a back-office page, not a primary destination

### 8. Reports / Clockify

Reports should be task-oriented, not nav-heavy.

Recommended structure:

- one report index page
- left-side report selector or tabs
- top filter bar
- results table first
- charts secondary

Clockify should be an integration/reporting area, not a main app pillar unless it is a daily operational workflow for most users.

### 9. Settings

Merge scattered admin pages into a single settings area with a left subnav or tabs:

- `People`
  - Users
  - Roles
- `Workflow`
  - Statuses
  - Sprints
  - Epics
- `Data`
  - Deleted tickets
- `Integrations`
  - Clockify

This is much cleaner than exposing separate top-level admin destinations.

## Recommended Component Structure

Build around a few strict page templates.

### Layout Components

- `AppShell`
- `PrimarySidebar`
- `SettingsSidebar`
- `PageSection`
- `PageToolbar`

### Page Templates

- `ListPageLayout`
  - header
  - filter row
  - main table or board
- `DetailPageLayout`
  - header
  - content column
  - metadata sidebar
- `SettingsPageLayout`
  - section nav
  - section content

### Ticketing Components

- `TicketListToolbar`
- `TicketQuickFilters`
- `TicketTable`
- `TicketBoard`
- `TicketRow`
- `TicketStatusBadge`
- `TicketPriorityBadge`
- `TicketPeopleCell`
- `TicketDetailHeader`
- `TicketDescriptionPanel`
- `TicketDiscussionPanel`
- `TicketMetadataPanel`
- `TicketRelationsPanel`

### Project Components

- `ProjectTable`
- `ProjectStatusBadge`
- `ProjectOverviewPanel`
- `ProjectSettingsForm`
- `ProjectTicketsView`

### Settings Components

- `SettingsSectionHeader`
- `SettingsTable`
- `PermissionMatrixEditor`
- `WorkflowEntityTable`

## UI Elements to Remove or Simplify

Remove:

- dashboard module card grid
- global gantt toggle on the tickets page
- epic and sprint create buttons from the global tickets toolbar
- pinned projects tree in the main sidebar
- version indicator in the main sidebar
- shortcuts row in the main sidebar
- copy URL / copy hyperlink actions as visible ticket-header buttons

Simplify:

- sidebar to 4-5 primary destinations max
- ticket filters to core defaults plus a `More filters` control
- ticket table columns to high-signal fields only
- project list to a narrow set of operational columns
- assets list to a plain reference table
- role management into one dense admin surface under settings

Collapse by default:

- timestamp editing
- advanced relations
- low-frequency admin utilities

## Best Practices From Strong Ticketing Tools

### Default to work, not navigation

Users should land on a queue or saved view, not a module menu.

### One clear primary action per screen

On the ticket list, that action is `Create ticket`.
Do not compete with that using `Create epic` and `Create sprint` in the same toolbar.

### Keep list pages optimized for scanning

Dense rows, consistent badges, predictable columns, and strong sorting matter more than decorative UI.

### Separate execution from configuration

Daily work:

- ticket list
- ticket detail
- project tickets

Occasional admin:

- statuses
- roles
- deleted tickets
- integrations

Do not mix them at the same navigation level.

### Hide advanced controls until needed

A simple product feels powerful when advanced options are available but not constantly visible.

### Preserve URL state

Filters, active view, and selected project should stay in the URL so users can share and return to the same view.

### Use the right screen for the right job

- list for queue management
- board for workflow visualization
- timeline only for scoped planning
- settings for admin work

Do not make one page handle all four equally.

### Avoid modal dependency

Use modals for create/edit forms where appropriate, but keep core reading and discussion on full pages.

### Treat comments as first-class

In ticketing systems, discussion is part of the work. Comments should not feel lower priority than metadata.

## Implementation Priority

### Phase 1

- make `Tickets` the default landing page
- simplify sidebar
- consolidate admin into `Settings`

### Phase 2

- redesign tickets list around default list view
- reduce toolbar actions and filters
- demote gantt to project-only planning

### Phase 3

- redesign ticket detail hierarchy
- move share/copy utilities into overflow
- collapse advanced metadata

### Phase 4

- simplify projects into project list + project detail
- move epic/sprint management into project scope

### Phase 5

- rehome assets, reports, and integrations based on actual usage frequency

## File-Specific Notes From Current Implementation

- Sidebar is overstuffed with top-level destinations and utility controls: `components/layout/sidebar.tsx`
- Dashboard is a module launcher, not a work surface: `app/(app)/(dashboard)/dashboard/page.tsx`
- Tickets page is carrying too many responsibilities at once: `features/tickets/components/tickets-client.tsx`
- Tickets toolbar currently mixes daily ticket actions with planning/setup actions: `components/tickets/tickets-toolbar.tsx`
- Ticket table needs a more useful default scan model: `components/tickets/tickets-table.tsx`
- Ticket detail page is structurally capable, but the hierarchy is fragmented: `features/tickets/components/ticket-detail-page-client.tsx`
- Ticket detail header gives too much space to copy/share utilities: `features/tickets/components/ticket-detail-header.tsx`
- Projects page is too wide and admin-heavy for a support page: `app/(app)/(dashboard)/projects/projects-client.tsx`
- Assets page should likely be demoted from primary navigation: `app/(app)/(dashboard)/assets/assets-client.tsx`
- Users and roles belong inside one settings area, not the main product flow: `app/(app)/(admin)/users/users-client.tsx`, `app/(app)/(admin)/roles/roles-client.tsx`

## Final Recommendation

Do not redesign this app by adding style.

Redesign it by:

- making tickets the center of gravity
- reducing the number of first-class destinations
- removing utility clutter from high-frequency screens
- separating project planning and admin setup from daily issue execution

The target should be boring, dense, predictable, and fast to scan.
