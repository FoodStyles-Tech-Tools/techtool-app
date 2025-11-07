/**
 * Version refresh script
 * This script handles version checking and cache clearing for updates
 */

export function generateVersionRefreshScript(): string {
  return `
    (function setupVersionRefresh(){
      const banner = document.getElementById('version-banner');
      const statusText = document.getElementById('version-status-text');
      const refreshBtn = document.getElementById('version-refresh-btn');
      const staleBadge = document.getElementById('version-stale-badge');
      const currentVersionInput = document.getElementById('app-version');

      if(!banner || !statusText || !refreshBtn || !currentVersionInput){
        return;
      }

      const currentVersion = currentVersionInput.value;

      // Store release notes globally for access
      let storedReleaseNotes = null;

      async function checkVersion(){
        try {
          const res = await fetch('/api/version?currentVersion=' + encodeURIComponent(currentVersion), { cache: 'no-store' });
          if(!res.ok) return;
          const info = await res.json();
          const latest = info?.version || info?.shortVersion || '';
          
          // Store release notes if available
          if(info?.releaseNotes && info.releaseNotes.length > 0) {
            storedReleaseNotes = info.releaseNotes;
          }
          
          if(latest && latest !== currentVersion){
            // Update available - show red badge
            banner.classList.add('is-stale');
            banner.classList.remove('is-latest');
            if (staleBadge) {
              staleBadge.hidden = false;
              staleBadge.textContent = 'Update available';
              staleBadge.classList.remove('is-latest');
              staleBadge.classList.add('is-stale');
            }
            refreshBtn.hidden = false; // CSS will show it in stale state
            statusText.textContent = 'Version ' + (info?.shortVersion || latest);
          } else if(latest && latest === currentVersion){
            // Latest version - show green badge
            banner.classList.remove('is-stale');
            banner.classList.add('is-latest');
            if (staleBadge) {
              staleBadge.hidden = false;
              staleBadge.textContent = 'Latest version';
              staleBadge.classList.remove('is-stale');
              staleBadge.classList.add('is-latest');
            }
            refreshBtn.hidden = true;
            statusText.textContent = 'Version ' + (info?.shortVersion || latest);
          }
        } catch(e){
          console.warn('Version check failed', e);
        }
      }

      // Function to show release notes modal
      function showReleaseNotesModal(releaseNotes) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('release-notes-modal');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'release-notes-modal';
          modal.className = 'release-notes-modal';
          modal.innerHTML = '<div class="release-notes-modal-overlay"></div>' +
            '<div class="release-notes-modal-content">' +
              '<div class="release-notes-modal-header">' +
                '<h2>Release Notes</h2>' +
                '<button class="release-notes-modal-close" aria-label="Close">' +
                  '<i class="fas fa-times"></i>' +
                '</button>' +
              '</div>' +
              '<div class="release-notes-modal-body" id="release-notes-content">' +
                '<!-- Release notes will be inserted here -->' +
              '</div>' +
              '<div class="release-notes-modal-footer">' +
                '<button class="release-notes-modal-update-btn" id="release-notes-update-btn">' +
                  '<i class="fas fa-sync-alt"></i>' +
                  'Update Now' +
                '</button>' +
                '<button class="release-notes-modal-close-btn" id="release-notes-close-btn">' +
                  'Update Later' +
                '</button>' +
              '</div>' +
            '</div>';
          document.body.appendChild(modal);
          
          // Close modal handlers
          const closeBtn = modal.querySelector('.release-notes-modal-close');
          const closeBtnFooter = modal.querySelector('#release-notes-close-btn');
          const overlay = modal.querySelector('.release-notes-modal-overlay');
          
          const closeModal = function() {
            modal.style.display = 'none';
          };
          
          if (closeBtn) closeBtn.addEventListener('click', closeModal);
          if (closeBtnFooter) closeBtnFooter.addEventListener('click', closeModal);
          if (overlay) overlay.addEventListener('click', closeModal);
        }
        
        // Render release notes
        const content = document.getElementById('release-notes-content');
        if (content && releaseNotes) {
          let html = '';
          releaseNotes.forEach(function(note) {
            html += '<div class="release-note-item">' +
              '<div class="release-note-header">' +
                '<h3>Version ' + escapeHtml(note.version) + '</h3>' +
                '<div class="release-note-meta">' +
                  '<span class="release-note-date">' + escapeHtml(note.releaseDate || 'N/A') + '</span>' +
                  '<span class="release-note-status status-' + escapeHtml(note.status.toLowerCase()) + '">' + escapeHtml(note.status) + '</span>' +
                '</div>' +
              '</div>' +
              '<div class="release-note-sections">';
            
            if (note.sections) {
              note.sections.forEach(function(section) {
                if (section.items && section.items.length > 0) {
                  html += '<div class="release-note-section">' +
                    '<h4>' + escapeHtml(section.title) + '</h4>' +
                    '<ul>';
                  section.items.forEach(function(item) {
                    html += '<li>' + escapeHtml(item) + '</li>';
                  });
                  html += '</ul>' +
                    '</div>';
                }
              });
            }
            
            html += '</div>' +
              '</div>';
          });
          content.innerHTML = html;
        }
        
        // Show modal
        modal.style.display = 'flex';
        
        // Update button handler - will be set up after modal is created
        setTimeout(function() {
          const updateBtn = document.getElementById('release-notes-update-btn');
          if (updateBtn) {
            updateBtn.onclick = function() {
              modal.style.display = 'none';
              proceedWithUpdate();
            };
          }
        }, 0);
      }

      // Helper function to escape HTML
      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // Function to proceed with the update
      async function proceedWithUpdate() {
        const icon = refreshBtn.querySelector('.version-refresh-icon');
        const label = refreshBtn.querySelector('.version-refresh-label');
        
        // Show loading state
        refreshBtn.disabled = true;
        refreshBtn.classList.add('is-updating');
        if(icon) icon.classList.add('fa-spin');
        if(label) label.textContent = 'Updating...';
        
        try {
          // Fetch the latest version info to ensure cache is updated
          const res = await fetch('/api/version?currentVersion=' + encodeURIComponent(currentVersion), { 
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          if(res.ok) {
            // Also fetch main app resources to bust cache
            await Promise.all([
              fetch('/js/app.js', { cache: 'reload' }).catch(() => {}),
              fetch('/manifest.webmanifest', { cache: 'reload' }).catch(() => {})
            ]);
          }
        } catch(e) {
          console.warn('Failed to fetch latest version:', e);
        }
        
        // Small delay to show "Updating..." state, then hard refresh (bypass cache)
        setTimeout(async () => {
          // Clear all cached data except session/auth
          try {
            // Clear localStorage (preserve nothing - NextAuth uses cookies)
            const localStorageKeys = Object.keys(localStorage);
            localStorageKeys.forEach(key => {
              localStorage.removeItem(key);
            });
            
            // Clear sessionStorage
            const sessionStorageKeys = Object.keys(sessionStorage);
            sessionStorageKeys.forEach(key => {
              sessionStorage.removeItem(key);
            });
            
            // Clear IndexedDB databases
            if ('indexedDB' in window) {
              try {
                const databases = await indexedDB.databases();
                await Promise.all(
                  databases.map(db => {
                    return new Promise((resolve, reject) => {
                      const deleteReq = indexedDB.deleteDatabase(db.name);
                      deleteReq.onsuccess = () => resolve();
                      deleteReq.onerror = () => reject(deleteReq.error);
                      deleteReq.onblocked = () => {
                        console.warn('IndexedDB database ' + db.name + ' is blocked, will retry');
                        setTimeout(() => resolve(), 100);
                      };
                    });
                  })
                );
              } catch (idbError) {
                console.warn('Error clearing IndexedDB:', idbError);
              }
            }
            
            // Clear all cache storage (including service worker caches)
            if ('caches' in window) {
              try {
                const cacheNames = await caches.keys();
                await Promise.all(
                  cacheNames.map(name => caches.delete(name))
                );
              } catch (cacheError) {
                console.warn('Error clearing cache storage:', cacheError);
              }
            }
            
            // Unregister service workers if any
            if ('serviceWorker' in navigator) {
              try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(
                  registrations.map(registration => registration.unregister())
                );
              } catch (swError) {
                console.warn('Error unregistering service workers:', swError);
              }
            }
            
            // Force hard refresh - equivalent to CTRL+SHIFT+R
            // First, fetch main resources with cache bypass to clear HTTP cache
            try {
              await Promise.all([
                fetch(window.location.href, { 
                  cache: 'reload',
                  headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                  }
                }).catch(() => {}),
                fetch('/js/app.js', { 
                  cache: 'reload',
                  headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                  }
                }).catch(() => {}),
                fetch('/manifest.webmanifest', { 
                  cache: 'reload',
                  headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                  }
                }).catch(() => {})
              ]);
            } catch (fetchError) {
              console.warn('Error fetching resources with cache bypass:', fetchError);
            }
            
            // Small delay to ensure all cache clearing operations complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Add timestamp to URL to force cache bypass
            const url = new URL(window.location.href);
            // Remove existing cache-busting params to keep URL clean
            url.searchParams.delete('_t');
            url.searchParams.delete('_hard');
            url.searchParams.set('_t', Date.now().toString());
            url.searchParams.set('_hard', '1');
            
            // Force a hard reload by using location.replace with timestamp
            // This bypasses HTTP cache and forces fresh resource loading
            // Using replace instead of href to avoid adding to history
            window.location.replace(url.toString());
            
          } catch (error) {
            console.error('Error clearing cache:', error);
            // Fallback: force hard reload using location.reload
            // Note: location.reload(true) is deprecated but still works in most browsers
            // As a last resort, use location.replace with timestamp
            const url = new URL(window.location.href);
            url.searchParams.set('_t', Date.now().toString());
            window.location.replace(url.toString());
          }
        }, 500);
      }

      refreshBtn.addEventListener('click', async function(){
        if(refreshBtn.disabled) return;
        
        // Show release notes modal if available
        if(storedReleaseNotes && storedReleaseNotes.length > 0) {
          showReleaseNotesModal(storedReleaseNotes);
          return; // Don't proceed with update yet, wait for user action
        }
        
        // If no release notes, proceed with update
        proceedWithUpdate();
      });

      // Initial check and a periodic re-check while the app runs
      checkVersion();
      setInterval(checkVersion, 60 * 1000);
    })();
  `;
}

