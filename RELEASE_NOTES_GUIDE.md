# Release Notes System Guide

This guide explains how to use the release notes system that displays update information when users fetch new versions.

## Overview

The release notes system automatically:
1. Parses release notes from `RELEASE_NOTES.md`
2. Shows release notes in a modal when an update is available
3. Displays what's new before users update

## How It Works

### 1. Release Notes File

Release notes are stored in `RELEASE_NOTES.md` at the root of the project. The file uses a structured markdown format:

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
```

### 2. Adding New Release Notes

When you release a new version:

1. **Open `RELEASE_NOTES.md`**
2. **Add a new entry at the top** (before existing versions)
3. **Follow the format** shown above
4. **Use appropriate emojis** for section types:
   - 🎉 Major Changes / Breaking Changes
   - ✨ New Features
   - 🔧 Improvements / Enhancements
   - 🐛 Bug Fixes
   - 🔒 Security Updates
   - 📝 Documentation

### 3. Version Numbering

Follow semantic versioning:
- **Major** (X.0.0): Breaking changes
- **Minor** (0.X.0): New features, backward compatible
- **Patch** (0.0.X): Bug fixes, small improvements

### 4. Status Types

- **Stable**: Production-ready, fully tested
- **Beta**: Feature-complete, testing phase
- **Alpha**: Early development, may have issues
- **Development**: Current development version

## User Experience

### When Update is Available

1. User sees "Update available" badge in version banner
2. User clicks "Fetch" button
3. **Release notes modal appears** showing what's new
4. User can:
   - Click "Update Now" to proceed with update
   - Click "Update Later" to close modal and update later

### Modal Features

- **Scrollable content** for long release notes
- **Multiple versions** shown if user is multiple versions behind
- **Status badges** (Stable, Beta, Alpha, Development)
- **Organized sections** with clear categorization
- **Responsive design** for mobile devices

## API Endpoints

### `/api/version`
Returns version info with release notes for versions newer than current:
- Query param: `currentVersion` (optional)
- Returns: Version info + release notes array

### `/api/release-notes`
Returns all release notes or specific version:
- Query param: `version` (optional) - specific version to fetch
- Returns: Release notes array or single release note

## Technical Details

### Files Involved

1. **`RELEASE_NOTES.md`** - Source of truth for release notes
2. **`lib/releaseNotes.ts`** - Parser and retrieval functions
3. **`lib/scripts/version-refresh.ts`** - Client-side script that displays modal
4. **`pages/api/version.ts`** - API endpoint for version info
5. **`pages/api/release-notes.ts`** - API endpoint for release notes
6. **`styles/globals.css`** - Modal styling

### Parsing Logic

The parser:
- Extracts version numbers from `### Version: X.Y.Z`
- Extracts release dates from `**Release Date**: YYYY-MM-DD`
- Extracts status from `**Status**: Stable`
- Groups items under section headers (####)
- Categorizes sections by emoji/header text

### Display Logic

- Only shows release notes for versions **newer** than current
- Sorts versions with newest first
- Groups items by section type
- Escapes HTML to prevent XSS

## Best Practices

1. **Keep it concise**: Users want quick overview, not essays
2. **Be specific**: "Fixed login bug" is better than "Bug fixes"
3. **Use clear language**: Avoid technical jargon when possible
4. **Update regularly**: Don't skip versions
5. **Include breaking changes**: Always highlight breaking changes prominently

## Example Release Note Entry

```markdown
### Version: 1.1.0
**Release Date**: 2024-01-15
**Status**: Stable

#### 🎉 Major Changes
- Complete codebase refactoring for improved performance
- Enhanced TypeScript strict mode for better type safety

#### ✨ New Features
- Release notes system with version history
- Dark mode persistence across sessions
- Improved error handling and validation

#### 🔧 Improvements
- Reduced bundle size by 15%
- Faster page load times
- Better mobile responsiveness

#### 🐛 Bug Fixes
- Fixed duplicate tickets issue in production
- Resolved skills dropdown positioning bug
- Fixed theme toggle not persisting
```

## Troubleshooting

### Release notes not showing?

1. Check `RELEASE_NOTES.md` format is correct
2. Verify version number matches current version
3. Check browser console for errors
4. Ensure API endpoints are accessible

### Modal not appearing?

1. Check if release notes exist for newer versions
2. Verify JavaScript is enabled
3. Check for CSS conflicts
4. Verify modal HTML is being created

### Parsing errors?

1. Ensure markdown format is correct
2. Check for special characters in content
3. Verify section headers use proper format
4. Check server logs for parsing errors

## Future Enhancements

Potential improvements:
- Markdown rendering with syntax highlighting
- Search functionality in release notes
- Email notifications for new releases
- Release notes RSS feed
- Changelog export to various formats

