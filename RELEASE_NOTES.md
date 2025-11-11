# Release Notes

This document tracks all version updates and changes to the TechTool application.

## Version History

### Version: 1.1.0
**Release Date**: 2024-12-19
**Status**: Stable

#### ✨ New Features
- **Project Collaborators Management**: Added multi-select dropdown for selecting collaborators when creating or editing projects
  - Collaborators stored as JSONB array format in database
  - Options populated from `public.user` "name" field
  - Visual tag/pill display for collaborators in project list view
- **Copy to Clipboard**: Added copy functionality for tickets in Projects view
  - Copy icon appears on each ticket row
  - Copies ticket summary in format: `[HRB-{id}] - Project: {project} / Epic: {epic} / {title}`
  - Visual feedback with toast notification

#### 🔧 Improvements
- **Project Filtering**: Enhanced project filtering logic to include projects where logged-in user is a collaborator
  - When "Show all projects" is false, now shows projects where user is owner OR collaborator
  - Filtering based on user name matching (not ID)
- **Project Search Navigation**: Fixed arrow key navigation in project search
  - Arrow down now moves one project at a time instead of jumping
  - Improved keyboard navigation with proper event handling
- **Collaborators UI**: Improved visual display of collaborators
  - Collaborators displayed as styled tags/pills below owner information
  - Better visual hierarchy and readability
- **Archived Tickets Exclusion**: Excluded archived tickets from Projects view
  - Archived tickets no longer appear in ticket lists
  - Archived tickets excluded from epic and project ticket counts
  - Consistent filtering across all project view components

#### 🐛 Bug Fixes
- Fixed project search arrow down navigation jumping to second item instead of moving sequentially
- Fixed archived tickets appearing in project ticket counts and epic statistics
- Improved event handling to prevent duplicate event listeners

---

### Version: dev (Current Development)
**Release Date**: Ongoing
**Status**: Development

#### 🐛 Bug Fixes
- **Dark Mode Search Modal**: Fixed CTRL+F search modal UI in dark mode
  - Added explicit dark mode styles for ticket search modal overlay, background, and borders
  - Improved text color contrast for input fields, placeholders, and result text
  - Enhanced visibility of icons, close button, and keyboard hints in dark mode
  - Fixed scrollbar styling and interactive element hover states for dark theme

---

### Version: 1.0.0
**Release Date**: 2024-01-01
**Status**: Stable

#### 🎉 Initial Release
- Complete codebase refactoring for improved performance and maintainability
- Enhanced TypeScript strict mode for better type safety
- Modular architecture with utility modules and custom hooks
- Optimized Next.js configuration for better performance
- Improved API route consistency and error handling

#### ✨ New Features
- Version checking and update notification system
- Theme mode (light/dark) with persistence
- Service worker support for offline functionality

#### 🔧 Improvements
- Code organization and separation of concerns
- Reduced code duplication across the codebase
- Better error handling and validation
- Performance optimizations

#### 🐛 Bug Fixes
- Fixed duplicate key constraint violations
- Resolved UI duplicate tickets issue
- Fixed skills dropdown positioning

---

## How to Add New Release Notes

When releasing a new version, add a new entry above this section following this format:

```markdown
### Version: X.Y.Z
**Release Date**: YYYY-MM-DD
**Status**: Stable | Beta | Alpha

#### 🎉 Major Changes
- Description of major changes

#### ✨ New Features
- New feature 1
- New feature 2

#### 🔧 Improvements
- Improvement 1
- Improvement 2

#### 🐛 Bug Fixes
- Bug fix 1
- Bug fix 2

#### 🔒 Security
- Security update 1

#### 📝 Documentation
- Documentation update 1
```

### Version Numbering
- **Major** (X.0.0): Breaking changes
- **Minor** (0.X.0): New features, backward compatible
- **Patch** (0.0.X): Bug fixes, small improvements

### Status Types
- **Stable**: Production-ready, fully tested
- **Beta**: Feature-complete, testing phase
- **Alpha**: Early development, may have issues

