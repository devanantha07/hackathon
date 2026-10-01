// Campus Companion - Main Application Logic
// SPA Client router, dynamic rendering, modal controllers, and live polling

(function() {
  'use strict';

  // State Management
  const state = {
    currentView: 'home',
    currentUser: null,
    config: null,
    places: [],
    events: [],
    issues: [],
    myIssues: [],
    lostFound: [],
    canteenMenu: [],
    canteenCrowd: null,
    busData: null,
    contacts: [],
    selectedNearMeChip: 'All',
    selectedPlacesChip: '',
    selectedEventGroup: 'all',
    selectedIssueTab: 'all',
    selectedLfType: '',
    activeSearchQuery: '',
    pollingTimer: null
  };

  // Toast System
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  // View Navigation Router
  function showView(viewId) {
    state.currentView = viewId;

    // Toggle active section
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const targetSection = document.getElementById(`view-${viewId}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Update bottom nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.dataset.view === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Special cases when entering a view
    if (viewId === 'home') {
      loadNearMePlaces(state.selectedNearMeChip);
      loadTodayFeed();
    } else if (viewId === 'places') {
      loadPlaces();
    } else if (viewId === 'events') {
      loadEvents();
    } else if (viewId === 'issues') {
      loadIssues();
    } else if (viewId === 'canteen') {
      loadCanteenData();
    } else if (viewId === 'bus') {
      loadBusData();
    } else if (viewId === 'lostfound') {
      loadLostFoundData();
    } else if (viewId === 'contacts') {
      loadContactsData();
    } else if (viewId === 'admin') {
      loadAdminPanel();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Modals management
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  // Authentication UI Sync
  function updateAuthUI() {
    state.currentUser = API.getUser();
    const authBtn = document.getElementById('header-auth-btn');
    const userAvatar = document.getElementById('header-user-avatar');
    const userName = document.getElementById('header-user-name');
    const adminEventBtn = document.getElementById('admin-create-event-btn');
    const adminMoreBtn = document.getElementById('menu-btn-admin');

    // Sidebar elements
    const sidebarAvatar = document.getElementById('sidebar-user-avatar');
    const sidebarName = document.getElementById('sidebar-user-name');
    const sidebarRole = document.getElementById('sidebar-user-role');
    const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');
    const sidebarAdminLink = document.getElementById('sidebar-admin-link');

    const authLoggedInBox = document.getElementById('auth-logged-in-box');
    const authFormsContainer = document.getElementById('auth-forms-container');

    if (state.currentUser) {
      const firstLetter = (state.currentUser.name || 'U').charAt(0).toUpperCase();
      userAvatar.textContent = firstLetter;
      userName.textContent = state.currentUser.name.split(' ')[0];

      if (sidebarAvatar) sidebarAvatar.textContent = firstLetter;
      if (sidebarName) sidebarName.textContent = state.currentUser.name;
      if (sidebarRole) sidebarRole.textContent = state.currentUser.role === 'admin' ? 'Campus Administrator' : 'Student Account';
      if (sidebarLogoutBtn) sidebarLogoutBtn.style.display = 'flex';

      // Admin specific controls
      if (state.currentUser.role === 'admin') {
        if (adminEventBtn) adminEventBtn.style.display = 'inline-flex';
        if (adminMoreBtn) adminMoreBtn.style.display = 'flex';
        if (sidebarAdminLink) sidebarAdminLink.style.display = 'flex';
      } else {
        if (adminEventBtn) adminEventBtn.style.display = 'none';
        if (adminMoreBtn) adminMoreBtn.style.display = 'none';
        if (sidebarAdminLink) sidebarAdminLink.style.display = 'none';
      }

      // Modal state
      if (authLoggedInBox && authFormsContainer) {
        authLoggedInBox.style.display = 'block';
        authFormsContainer.style.display = 'none';
        document.getElementById('profile-modal-avatar').textContent = firstLetter;
        document.getElementById('profile-modal-name').textContent = state.currentUser.name;
        document.getElementById('profile-modal-email').textContent = state.currentUser.email;
        const rolePill = document.getElementById('profile-modal-role');
        rolePill.textContent = state.currentUser.role === 'admin' ? 'Campus Admin' : 'Student';
        rolePill.className = `status-pill ${state.currentUser.role === 'admin' ? 'status-busy' : 'status-available'}`;
      }
    } else {
      userAvatar.textContent = '?';
      userName.textContent = 'Login';
      if (sidebarAvatar) sidebarAvatar.textContent = '?';
      if (sidebarName) sidebarName.textContent = 'Guest Student';
      if (sidebarRole) sidebarRole.textContent = 'Click to log in';
      if (sidebarLogoutBtn) sidebarLogoutBtn.style.display = 'none';
      if (sidebarAdminLink) sidebarAdminLink.style.display = 'none';

      if (adminEventBtn) adminEventBtn.style.display = 'none';
      if (adminMoreBtn) adminMoreBtn.style.display = 'none';

      if (authLoggedInBox && authFormsContainer) {
        authLoggedInBox.style.display = 'none';
        authFormsContainer.style.display = 'block';
      }
    }
  }

  // Load campus configuration
  async function loadConfig() {
    try {
      const config = await API.config.get();
      state.config = config;

      // Populate college name in header & sidebar
      const collegeHeader = document.getElementById('header-college-name');
      if (collegeHeader && config.collegeName) {
        collegeHeader.textContent = config.collegeName;
      }
      const sidebarCollege = document.getElementById('sidebar-college-name');
      if (sidebarCollege && config.shortName) {
        sidebarCollege.textContent = config.shortName;
      }

      // Populate building dropdowns in both desktop form and modal form
      const blockOptions = '<option value="">Select Building</option>' +
        (config.buildings || []).map(b => `<option value="${b}">${b}</option>`).join('');

      const blockSelect = document.getElementById('issue-block');
      if (blockSelect) blockSelect.innerHTML = blockOptions;

      const modalBlockSelect = document.getElementById('modal-issue-block');
      if (modalBlockSelect) modalBlockSelect.innerHTML = blockOptions;
    } catch (e) {
      console.warn('Could not load campus config:', e);
    }
  }

  // ==========================================
  // FEATURE 1: HOME & "WHAT'S NEAR ME?"
  // ==========================================
  async function loadNearMePlaces(type = 'All') {
    state.selectedNearMeChip = type;
    const container = document.getElementById('home-places-list');
    if (!container) return;

    container.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';

    try {
      const filterType = (type === 'All') ? '' : type;
      const places = await API.places.getAll(filterType);
      
      const countLabel = document.getElementById('near-me-count');
      if (countLabel) {
        countLabel.textContent = `${places.length} spot${places.length === 1 ? '' : 's'}`;
      }

      if (places.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div class="empty-title">No spots found</div>
            <div class="empty-desc">No places matching '${type}' were found in this area.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = places.map(p => renderPlaceCard(p)).join('');
      attachPlaceActionListeners(container);
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="empty-title">Error loading places</div><div class="empty-desc">${err.message}</div></div>`;
    }
  }

  function getStatusClass(status) {
    if (status === 'Available' || status === 'Resolved' || status === 'Low' || status === 'Returned / Claimed') {
      return 'status-available';
    }
    if (status === 'Busy' || status === 'In Progress' || status === 'Medium') {
      return 'status-busy';
    }
    return 'status-full';
  }

  function renderPlaceCard(place) {
    const statusClass = getStatusClass(place.status);

    return `
      <div class="item-card" data-place-id="${place.id}">
        <div class="card-top">
          <div>
            <h3 class="card-title">${escapeHtml(place.name)}</h3>
            <div class="card-meta">
              <span>📍 ${escapeHtml(place.building)}</span>
              <span>•</span>
              <span>🏢 ${escapeHtml(place.floor)}</span>
              <span>•</span>
              <span>🏷️ ${escapeHtml(place.type)}</span>
            </div>
          </div>
          <span class="status-pill ${statusClass}">
            <span class="status-dot"></span>
            ${escapeHtml(place.status)}
          </span>
        </div>
        <p class="card-desc">${escapeHtml(place.description || '')}</p>
        <div class="card-actions">
          <span style="font-size: 11px; color: var(--text-muted);">
            🕒 ${escapeHtml(place.relative_updated || 'recently')}
          </span>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-sm btn-update-place-status" data-place-id="${place.id}">
              Update Status
            </button>
            <button class="btn btn-primary btn-sm btn-view-directions" data-place-id="${place.id}">
              Directions
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function attachPlaceActionListeners(parent) {
    // Directions button
    parent.querySelectorAll('.btn-view-directions').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const placeId = parseInt(btn.dataset.placeId, 10);
        showDirectionsModal(placeId);
      });
    });

    // Update status button
    parent.querySelectorAll('.btn-update-place-status').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (!state.currentUser) {
          showToast('Please log in to update place status.', 'info');
          openModal('auth-modal');
          return;
        }
        const placeId = btn.dataset.placeId;
        document.getElementById('status-target-place-id').value = placeId;
        openModal('update-place-status-modal');
      });
    });
  }

  async function showDirectionsModal(placeId) {
    const content = document.getElementById('directions-modal-content');
    const title = document.getElementById('directions-place-name');
    content.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
    openModal('directions-modal');

    try {
      const places = await API.places.getAll();
      const place = places.find(p => p.id === placeId);
      if (!place) throw new Error('Place not found');

      title.textContent = place.name;

      const statusClass = getStatusClass(place.status);

      content.innerHTML = `
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span class="status-pill ${statusClass}">
              <span class="status-dot"></span> Current Status: ${place.status}
            </span>
            <span style="font-size: 12px; color: var(--text-muted);">${place.relative_updated || 'recently'}</span>
          </div>

          <div style="background: var(--bg-surface-elevated); padding: 12px; border-radius: var(--radius-md); margin-bottom: 14px;">
            <div style="font-size: 13px; margin-bottom: 4px;"><strong>Building:</strong> ${escapeHtml(place.building)}</div>
            <div style="font-size: 13px; margin-bottom: 4px;"><strong>Floor Level:</strong> ${escapeHtml(place.floor)}</div>
            <div style="font-size: 13px;"><strong>Category:</strong> ${escapeHtml(place.type)}</div>
          </div>

          <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 8px; color: var(--secondary);">
            🗺️ Step-by-Step Route Directions
          </h4>
          <div style="background: rgba(99, 102, 241, 0.08); border-left: 3px solid var(--primary); padding: 12px 14px; border-radius: 4px; font-size: 13px; line-height: 1.5; color: var(--text-main);">
            ${escapeHtml(place.route_directions || 'Follow standard campus walkways to the building entrance, then take stairs or elevator to destination floor.')}
          </div>
        </div>
        <button class="btn btn-primary btn-block" onclick="document.getElementById('directions-modal').classList.remove('active')">
          Got It, Thanks!
        </button>
      `;
    } catch (e) {
      content.innerHTML = `<div class="empty-state"><div class="empty-title">Error loading directions</div><div class="empty-desc">${e.message}</div></div>`;
    }
  }

  // Load "Today" summary feed
  async function loadTodayFeed() {
    try {
      const feed = await API.today.get();

      // Next Event
      const evTitle = document.getElementById('today-event-title');
      const evTime = document.getElementById('today-event-time');
      if (feed.nextEvent) {
        evTitle.textContent = feed.nextEvent.title;
        evTime.textContent = `📅 ${feed.nextEvent.event_date} at ${feed.nextEvent.event_time}`;
      } else {
        evTitle.textContent = 'No events today';
        evTime.textContent = 'Check upcoming';
      }

      // Canteen Crowd
      const cCrowd = document.getElementById('today-canteen-crowd');
      const cWait = document.getElementById('today-canteen-wait');
      if (feed.canteen) {
        cCrowd.textContent = `${feed.canteen.level} Crowd`;
        cWait.textContent = `Wait: ${feed.canteen.waitTime}`;
      }

      // Next Bus
      const busRoute = document.getElementById('today-bus-route');
      const busTime = document.getElementById('today-bus-time');
      if (feed.nextBus) {
        busRoute.textContent = `${feed.nextBus.route_number} (${feed.nextBus.destination.split(' ')[0]})`;
        busTime.textContent = `🕒 ${feed.nextBus.time}`;
      } else {
        busRoute.textContent = 'No bus schedule';
        busTime.textContent = '--:--';
      }

      // User Open Issues
      const issuesCount = document.getElementById('today-issues-count');
      const issuesSub = document.getElementById('today-issues-sub');
      const issuesBadge = document.getElementById('nav-issues-badge');
      const sidebarIssuesBadge = document.getElementById('sidebar-issues-badge');
      if (feed.isLoggedIn) {
        issuesCount.textContent = `${feed.myOpenIssuesCount} Open Issue${feed.myOpenIssuesCount === 1 ? '' : 's'}`;
        issuesSub.textContent = feed.myOpenIssuesCount > 0 ? 'Tracking resolution' : 'All resolved!';
        if (issuesBadge) {
          issuesBadge.textContent = feed.myOpenIssuesCount;
          issuesBadge.style.display = feed.myOpenIssuesCount > 0 ? 'block' : 'none';
        }
        if (sidebarIssuesBadge) {
          sidebarIssuesBadge.textContent = feed.myOpenIssuesCount;
          sidebarIssuesBadge.style.display = feed.myOpenIssuesCount > 0 ? 'inline-block' : 'none';
        }
      } else {
        issuesCount.textContent = 'Log in to track';
        issuesSub.textContent = 'View your reports';
        if (issuesBadge) issuesBadge.style.display = 'none';
        if (sidebarIssuesBadge) sidebarIssuesBadge.style.display = 'none';
      }
    } catch (e) {
      console.warn('Could not load today feed:', e);
    }
  }

  // ==========================================
  // FEATURE 2: CAMPUS PLACES & NAVIGATOR
  // ==========================================
  async function loadPlaces(type = '') {
    state.selectedPlacesChip = type;
    const container = document.getElementById('places-list-container');
    if (!container) return;

    container.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';

    try {
      const places = await API.places.getAll(type);
      if (places.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-title">No places listed</div>
            <div class="empty-desc">No campus locations match this filter.</div>
          </div>
        `;
        return;
      }
      container.innerHTML = places.map(p => renderPlaceCard(p)).join('');
      attachPlaceActionListeners(container);
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><div class="empty-title">Failed to load places</div><div class="empty-desc">${e.message}</div></div>`;
    }
  }

  // ==========================================
  // FEATURE 3: EVENTS
  // ==========================================
  async function loadEvents() {
    const container = document.getElementById('events-list-container');
    if (!container) return;

    container.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';

    try {
      const events = await API.events.getAll();
      state.events = events;

      const filtered = events.filter(e => {
        if (state.selectedEventGroup === 'all') return true;
        return e.group_tag === state.selectedEventGroup;
      });

      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
            </svg>
            <div class="empty-title">No events scheduled</div>
            <div class="empty-desc">No events found for this filter tab.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map(ev => {
        const isAdmin = state.currentUser && state.currentUser.role === 'admin';
        const isRegistered = ev.is_registered;

        return `
          <div class="item-card" data-event-id="${ev.id}">
            <div class="card-top">
              <div>
                <h3 class="card-title">${escapeHtml(ev.title)}</h3>
                <div class="card-meta">
                  <span class="status-pill status-low">${escapeHtml(ev.category)}</span>
                  <span>•</span>
                  <span>📍 ${escapeHtml(ev.location)}</span>
                </div>
              </div>
              <span class="status-pill ${ev.group_tag === 'Today' ? 'status-busy' : 'status-available'}">
                ${ev.group_tag}
              </span>
            </div>

            <p class="card-desc">${escapeHtml(ev.description || '')}</p>

            <div style="background: var(--bg-surface-elevated); padding: 8px 12px; border-radius: var(--radius-md); font-size: 12px; margin-bottom: 12px; display: flex; justify-content: space-between;">
              <span>🗓️ <strong>${ev.event_date}</strong> at <strong>${ev.event_time}</strong></span>
              <span>👥 <strong id="reg-count-${ev.id}">${ev.registration_count}</strong> Registered</span>
            </div>

            <div class="card-actions">
              ${isAdmin ? `
                <button class="btn btn-outline btn-sm btn-delete-event" data-event-id="${ev.id}" style="color: var(--danger); border-color: rgba(239, 68, 68, 0.3);">
                  🗑️ Delete
                </button>
              ` : '<span></span>'}

              <button class="btn ${isRegistered ? 'btn-secondary' : 'btn-primary'} btn-sm btn-register-event" data-event-id="${ev.id}" ${isRegistered ? 'disabled' : ''}>
                ${isRegistered ? '✓ Registered' : 'Register Now'}
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Event listeners
      container.querySelectorAll('.btn-register-event').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!state.currentUser) {
            showToast('Please log in to register for events.', 'info');
            openModal('auth-modal');
            return;
          }
          const eventId = parseInt(btn.dataset.eventId, 10);
          btn.disabled = true;
          btn.textContent = 'Registering...';

          try {
            const res = await API.events.register(eventId);
            showToast(res.message || 'Registered successfully!', 'success');
            btn.className = 'btn btn-secondary btn-sm';
            btn.textContent = '✓ Registered';
            const countEl = document.getElementById(`reg-count-${eventId}`);
            if (countEl) countEl.textContent = res.registration_count;
          } catch (err) {
            showToast(err.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Register Now';
          }
        });
      });

      // Admin delete
      container.querySelectorAll('.btn-delete-event').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Are you sure you want to delete this event?')) return;
          const eventId = parseInt(btn.dataset.eventId, 10);
          try {
            await API.events.delete(eventId);
            showToast('Event deleted successfully.', 'success');
            loadEvents();
          } catch (err) {
            showToast(err.message, 'error');
          }
        });
      });
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><div class="empty-title">Error loading events</div><div class="empty-desc">${e.message}</div></div>`;
    }
  }

  // ==========================================
  // FEATURE 4: REPORT CAMPUS ISSUES
  // ==========================================
  async function loadIssues() {
    const container = document.getElementById('issues-list-container');
    if (!container) return;

    container.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';

    try {
      if (state.selectedIssueTab === 'mine') {
        if (!state.currentUser) {
          container.innerHTML = `
            <div class="empty-state">
              <div class="empty-title">Please Log In</div>
              <div class="empty-desc">Log in to view your reported issues and resolution timeline.</div>
              <button class="btn btn-primary btn-sm" onclick="document.getElementById('header-auth-btn').click()" style="margin-top: 14px;">
                Log In Now
              </button>
            </div>
          `;
          return;
        }

        const myIssues = await API.issues.getMine();
        if (myIssues.length === 0) {
          container.innerHTML = `
            <div class="empty-state">
              <div class="empty-title">No issues reported yet</div>
              <div class="empty-desc">You haven't submitted any campus maintenance reports yet.</div>
            </div>
          `;
          return;
        }

        container.innerHTML = myIssues.map(iss => renderMyIssueTimelineCard(iss)).join('');
      } else {
        const issues = await API.issues.getAll();
        if (issues.length === 0) {
          container.innerHTML = `
            <div class="empty-state">
              <div class="empty-title">No issues reported</div>
              <div class="empty-desc">Campus is operating smoothly with 0 active reported issues!</div>
            </div>
          `;
          return;
        }

        container.innerHTML = issues.map(iss => renderCommunityIssueCard(iss)).join('');
        attachIssueActionListeners(container);
      }
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><div class="empty-title">Error loading issues</div><div class="empty-desc">${e.message}</div></div>`;
    }
  }

  function renderCommunityIssueCard(iss) {
    const statusClass = getStatusClass(iss.status);
    const isAdmin = state.currentUser && state.currentUser.role === 'admin';

    return `
      <div class="item-card" data-issue-id="${iss.id}">
        <div class="card-top">
          <div>
            <h3 class="card-title">#${iss.id} • ${escapeHtml(iss.block)}</h3>
            <div class="card-meta">
              <span class="status-pill status-low">🔧 ${escapeHtml(iss.category)}</span>
              <span>•</span>
              <span>By ${escapeHtml(iss.reporter_name || 'Student')}</span>
              <span>•</span>
              <span>🕒 ${iss.relative_created || 'recently'}</span>
            </div>
          </div>
          <span class="status-pill ${statusClass}">
            <span class="status-dot"></span>
            ${escapeHtml(iss.status)}
          </span>
        </div>

        <p class="card-desc">${escapeHtml(iss.description)}</p>

        ${iss.photo_url ? `
          <img src="${escapeHtml(iss.photo_url)}" alt="Issue Photo" class="card-photo" onclick="window.open('${escapeHtml(iss.photo_url)}')">
        ` : ''}

        <div class="card-actions">
          <button class="upvote-btn ${iss.has_voted ? 'voted' : ''}" data-issue-id="${iss.id}">
            <span>▲ +1 I see this too</span>
            <span id="vote-count-${iss.id}">(${iss.upvotes})</span>
          </button>

          ${isAdmin ? `
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 11px; color: var(--text-muted);">Status:</span>
              <select class="form-select admin-issue-status-select" data-issue-id="${iss.id}" style="padding: 4px 8px; font-size: 11px; width: auto;">
                <option value="Reported" ${iss.status === 'Reported' ? 'selected' : ''}>Reported</option>
                <option value="In Progress" ${iss.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                <option value="Resolved" ${iss.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
              </select>
            </div>
          ` : `
            <span style="font-size: 11px; color: var(--text-muted);">
              Updated ${iss.relative_updated || 'recently'}
            </span>
          `}
        </div>
      </div>
    `;
  }

  function renderMyIssueTimelineCard(iss) {
    const isReported = true;
    const isInProgress = iss.status === 'In Progress' || iss.status === 'Resolved';
    const isResolved = iss.status === 'Resolved';

    return `
      <div class="item-card">
        <div class="card-top">
          <div>
            <h3 class="card-title">#${iss.id} • ${escapeHtml(iss.block)}</h3>
            <div class="card-meta">
              <span>Category: <strong>${escapeHtml(iss.category)}</strong></span>
            </div>
          </div>
          <span class="status-pill ${getStatusClass(iss.status)}">
            <span class="status-dot"></span> ${iss.status}
          </span>
        </div>

        <p class="card-desc">${escapeHtml(iss.description)}</p>

        ${iss.photo_url ? `
          <img src="${escapeHtml(iss.photo_url)}" alt="Issue Photo" class="card-photo">
        ` : ''}

        <!-- Status Timeline -->
        <div class="timeline">
          <div class="timeline-step">
            <div class="step-node ${isReported ? 'completed' : ''}">✓</div>
            <div class="step-content">
              <div class="step-title">Report Submitted</div>
              <div class="step-date">${iss.created_at}</div>
            </div>
          </div>

          <div class="timeline-step">
            <div class="step-node ${isInProgress ? (isResolved ? 'completed' : 'current') : ''}">
              ${isInProgress ? '⚙️' : '•'}
            </div>
            <div class="step-content">
              <div class="step-title">Assigned & In Progress</div>
              <div class="step-date">${isInProgress ? 'Maintenance team dispatched' : 'Pending review'}</div>
            </div>
          </div>

          <div class="timeline-step">
            <div class="step-node ${isResolved ? 'completed' : ''}">
              ${isResolved ? '✓' : '•'}
            </div>
            <div class="step-content">
              <div class="step-title">Issue Resolved</div>
              <div class="step-date">${isResolved ? 'Verified fixed by supervisor' : 'Awaiting completion'}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function attachIssueActionListeners(parent) {
    // Upvote button
    parent.querySelectorAll('.upvote-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!state.currentUser) {
          showToast('Please log in to upvote issues.', 'info');
          openModal('auth-modal');
          return;
        }

        const issueId = parseInt(btn.dataset.issueId, 10);
        try {
          const res = await API.issues.upvote(issueId);
          btn.classList.add('voted');
          const countEl = document.getElementById(`vote-count-${issueId}`);
          if (countEl) countEl.textContent = `(${res.upvotes})`;
          showToast(res.message || '+1 Upvote registered!', 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    // Admin status change
    parent.querySelectorAll('.admin-issue-status-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const issueId = parseInt(sel.dataset.issueId, 10);
        const newStatus = sel.value;
        try {
          await API.issues.updateStatus(issueId, newStatus);
          showToast(`Issue #${issueId} status updated to ${newStatus}`, 'success');
          loadIssues();
          loadTodayFeed();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  }

  // ==========================================
  // FEATURE 5: CANTEEN CORNER & CROWD METER
  // ==========================================
  async function loadCanteenData() {
    try {
      // Crowd Info
      const crowd = await API.canteen.getCrowd();
      state.canteenCrowd = crowd;

      const levelEl = document.getElementById('canteen-crowd-level');
      const waitEl = document.getElementById('canteen-crowd-wait');
      const countEl = document.getElementById('canteen-votes-count');
      const pillEl = document.getElementById('canteen-crowd-status-pill');
      const timeEl = document.getElementById('canteen-crowd-timestamp');

      if (levelEl) levelEl.textContent = crowd.level;
      if (waitEl) waitEl.textContent = crowd.waitTime;
      if (countEl) countEl.textContent = crowd.totalVotes;
      if (timeEl) timeEl.textContent = crowd.lastUpdated;

      if (pillEl) {
        pillEl.className = `status-pill ${getStatusClass(crowd.level)}`;
      }

      // Menu
      const menuList = document.getElementById('canteen-menu-list');
      if (menuList) {
        menuList.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
        const menu = await API.canteen.getMenu();
        state.canteenMenu = menu;

        const isAdmin = state.currentUser && state.currentUser.role === 'admin';

        menuList.innerHTML = menu.map(item => `
          <div class="item-card" data-menu-id="${item.id}">
            <div class="card-top">
              <div>
                <h4 style="font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 2px;">
                  ${escapeHtml(item.item)}
                </h4>
                <div class="card-meta">
                  <span>${escapeHtml(item.category)}</span>
                  <span>•</span>
                  <span style="color: var(--secondary); font-weight: 700; font-size: 14px;">₹${item.price}</span>
                </div>
              </div>

              <span class="status-pill ${item.available ? 'status-available' : 'status-full'}">
                <span class="status-dot"></span>
                ${item.available ? 'Available' : 'Sold Out'}
              </span>
            </div>

            ${isAdmin ? `
              <div class="card-actions" style="margin-top: 6px;">
                <span style="font-size: 11px; color: var(--text-muted);">Admin Controls</span>
                <button class="btn btn-secondary btn-sm btn-toggle-menu-avail" data-item-id="${item.id}" data-current="${item.available}">
                  ${item.available ? 'Mark Sold Out' : 'Mark Available'}
                </button>
              </div>
            ` : ''}
          </div>
        `).join('');

        if (isAdmin) {
          menuList.querySelectorAll('.btn-toggle-menu-avail').forEach(btn => {
            btn.addEventListener('click', async () => {
              const itemId = parseInt(btn.dataset.itemId, 10);
              const currentAvail = btn.dataset.current === '1';
              try {
                await API.canteen.updateMenu(itemId, { available: !currentAvail });
                showToast('Menu item updated successfully!', 'success');
                loadCanteenData();
              } catch (err) {
                showToast(err.message, 'error');
              }
            });
          });
        }
      }
    } catch (e) {
      console.warn('Error loading canteen data:', e);
    }
  }

  // Cast crowd vote
  async function voteCanteenCrowd(level) {
    if (!state.currentUser) {
      showToast('Please log in to vote on crowd levels.', 'info');
      openModal('auth-modal');
      return;
    }

    try {
      const res = await API.canteen.voteCrowd(level);
      showToast(res.message || `Marked canteen crowd as ${level}!`, 'success');
      loadCanteenData();
      loadTodayFeed();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ==========================================
  // FEATURE 6: BUS SCHEDULES
  // ==========================================
  async function loadBusData() {
    const container = document.getElementById('bus-routes-list');
    if (!container) return;

    container.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';

    try {
      const busData = await API.bus.getAll();
      state.busData = busData;

      // Update highlight card
      const highlight = busData.nextUpcomingBus;
      if (highlight) {
        document.getElementById('bus-highlight-route').textContent = `${highlight.route_number}: ${highlight.destination}`;
        document.getElementById('bus-highlight-dest').textContent = highlight.minutesAway !== null 
          ? `Departing in ~${highlight.minutesAway} mins from ${highlight.pickup_point}`
          : `Departure: ${highlight.time} from ${highlight.pickup_point}`;
        document.getElementById('bus-highlight-time').textContent = highlight.time;
        document.getElementById('bus-highlight-pickup').textContent = highlight.pickup_point;
      }

      const now = new Date();
      document.getElementById('bus-time-now').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Render clean table on desktop and responsive cards
      container.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Destination Corridors</th>
                <th>Pickup Bay</th>
                <th>Today's Timetable</th>
                <th>Days</th>
                <th>Next Departure</th>
              </tr>
            </thead>
            <tbody>
              ${busData.routes.map(r => `
                <tr>
                  <td><strong style="color: #fff; font-size: 14px;">${escapeHtml(r.route_number)}</strong></td>
                  <td><strong style="color: var(--text-main);">${escapeHtml(r.destination)}</strong></td>
                  <td>📍 ${escapeHtml(r.pickup_point)}</td>
                  <td>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                      ${r.timesList.map(t => {
                        const isNext = (t === r.nextBus && !r.isTomorrow);
                        return `
                          <span style="font-size: 11px; padding: 3px 8px; border-radius: 4px; ${isNext ? 'background: var(--primary); color: #fff; font-weight: 800; box-shadow: 0 0 10px var(--primary-glow);' : 'background: var(--bg-surface-elevated); color: var(--text-secondary);'}">
                            ${t}
                          </span>
                        `;
                      }).join('')}
                    </div>
                  </td>
                  <td><span style="font-size: 12px; color: var(--text-muted);">${escapeHtml(r.active_days)}</span></td>
                  <td>
                    <span class="status-pill status-available">
                      ${escapeHtml(r.nextBusLabel)}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><div class="empty-title">Error loading bus routes</div><div class="empty-desc">${e.message}</div></div>`;
    }
  }

  // ==========================================
  // FEATURE 7: LOST & FOUND
  // ==========================================
  async function loadLostFoundData() {
    const container = document.getElementById('lostfound-list-container');
    if (!container) return;

    container.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';

    try {
      const items = await API.lostfound.getAll({ type: state.selectedLfType });
      state.lostFound = items;

      if (items.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div class="empty-title">No lost items yet</div>
            <div class="empty-desc">No reported lost or found items in this category.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = items.map(item => {
        const isResolved = item.status === 'Returned / Claimed';
        const canResolve = item.is_owner && !isResolved;

        return `
          <div class="item-card" data-lf-id="${item.id}">
            <div class="card-top">
              <div>
                <h3 class="card-title">${escapeHtml(item.title)}</h3>
                <div class="card-meta">
                  <span class="status-pill ${item.type === 'Lost' ? 'status-full' : 'status-low'}">
                    ${item.type}
                  </span>
                  <span>•</span>
                  <span>Category: <strong>${escapeHtml(item.category)}</strong></span>
                  <span>•</span>
                  <span>🕒 ${item.relative_created || 'recently'}</span>
                </div>
              </div>

              <span class="status-pill ${isResolved ? 'status-available' : 'status-busy'}">
                <span class="status-dot"></span>
                ${escapeHtml(item.status)}
              </span>
            </div>

            <p class="card-desc">${escapeHtml(item.description)}</p>

            ${item.photo_url ? `
              <img src="${escapeHtml(item.photo_url)}" alt="Item Photo" class="card-photo" onclick="window.open('${escapeHtml(item.photo_url)}')">
            ` : ''}

            <div style="background: var(--bg-surface-elevated); padding: 8px 12px; border-radius: var(--radius-md); font-size: 12px; margin-bottom: 10px;">
              <div>📍 <strong>Location:</strong> ${escapeHtml(item.location)}</div>
              <div>📞 <strong>Contact:</strong> ${escapeHtml(item.contact_info)}</div>
            </div>

            <div class="card-actions">
              <span style="font-size: 11px; color: var(--text-muted);">
                Posted by ${escapeHtml(item.reporter_name || 'Student')}
              </span>

              ${canResolve ? `
                <button class="btn btn-primary btn-sm btn-resolve-lf" data-lf-id="${item.id}">
                  ✓ Mark Returned / Claimed
                </button>
              ` : (isResolved ? `
                <span style="font-size: 11px; color: var(--success); font-weight: 700;">
                  ✓ Returned to Owner
                </span>
              ` : '')}
            </div>
          </div>
        `;
      }).join('');

      container.querySelectorAll('.btn-resolve-lf').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = parseInt(btn.dataset.lfId, 10);
          try {
            await API.lostfound.resolve(id);
            showToast('Item successfully marked as Returned / Claimed!', 'success');
            loadLostFoundData();
          } catch (err) {
            showToast(err.message, 'error');
          }
        });
      });
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><div class="empty-title">Error loading items</div><div class="empty-desc">${e.message}</div></div>`;
    }
  }

  // ==========================================
  // FEATURE 8: EMERGENCY CONTACTS & HELP
  // ==========================================
  async function loadContactsData() {
    const container = document.getElementById('contacts-list-container');
    if (!container) return;

    container.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';

    try {
      const contacts = await API.contacts.getAll();
      state.contacts = contacts;

      container.innerHTML = contacts.map(c => `
        <div class="item-card" style="border-left: 4px solid var(--danger);">
          <div class="card-top">
            <div>
              <h3 class="card-title" style="color: var(--text-main);">${escapeHtml(c.title)}</h3>
              <div class="card-meta">
                <span>📍 ${escapeHtml(c.location || 'Campus')}</span>
                <span>•</span>
                <span class="status-pill status-available" style="padding: 1px 6px; font-size: 10px;">${escapeHtml(c.available_hours || '24x7')}</span>
              </div>
            </div>
            <a href="tel:${escapeHtml(c.number.replace(/\s+/g, ''))}" class="btn btn-primary btn-sm" style="background: var(--danger); box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);">
              📞 Call Now
            </a>
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #fff; margin-top: 4px;">
            ${escapeHtml(c.number)}
          </div>
        </div>
      `).join('');
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><div class="empty-title">Error loading contacts</div><div class="empty-desc">${e.message}</div></div>`;
    }
  }

  // ==========================================
  // FEATURE 9: ADMIN COMMAND CENTER
  // ==========================================
  let activeAdminSubtab = 'issues';

  async function loadAdminPanel() {
    const container = document.getElementById('admin-panel-content');
    if (!container) return;

    if (!state.currentUser || state.currentUser.role !== 'admin') {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-title">Administrator Access Required</div>
          <div class="empty-desc">You must be logged in as an administrator to access this command center.</div>
          <button class="btn btn-primary btn-sm" id="btn-admin-login-shortcut" style="margin-top: 14px;">
            Log In as Admin
          </button>
        </div>
      `;
      const btn = document.getElementById('btn-admin-login-shortcut');
      if (btn) {
        btn.addEventListener('click', () => {
          document.getElementById('quick-login-admin').click();
        });
      }
      return;
    }

    container.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';

    try {
      if (activeAdminSubtab === 'issues') {
        const issues = await API.issues.getAll();
        container.innerHTML = `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Building Block</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Reporter</th>
                  <th>Upvotes</th>
                  <th>Status Action</th>
                </tr>
              </thead>
              <tbody>
                ${issues.map(iss => `
                  <tr>
                    <td><strong>#${iss.id}</strong></td>
                    <td>${escapeHtml(iss.block)}</td>
                    <td><span class="status-pill status-low">${escapeHtml(iss.category)}</span></td>
                    <td style="max-width: 300px;">
                      <div>${escapeHtml(iss.description)}</div>
                      ${iss.photo_url ? `<a href="${escapeHtml(iss.photo_url)}" target="_blank" style="font-size: 11px; color: var(--secondary);">📷 View Photo</a>` : ''}
                    </td>
                    <td>${escapeHtml(iss.reporter_name || 'Student')}</td>
                    <td><strong>▲ ${iss.upvotes}</strong></td>
                    <td>
                      <select class="form-select admin-issue-status-select" data-issue-id="${iss.id}" style="padding: 4px 8px; font-size: 12px; width: 130px;">
                        <option value="Reported" ${iss.status === 'Reported' ? 'selected' : ''}>Reported</option>
                        <option value="In Progress" ${iss.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                        <option value="Resolved" ${iss.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                      </select>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
        attachIssueActionListeners(container);
      } else if (activeAdminSubtab === 'events') {
        const events = await API.events.getAll();
        container.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <span style="font-size: 14px; color: var(--text-secondary);">Manage campus calendar and registrations:</span>
            <button class="btn btn-primary btn-sm" id="btn-admin-add-event-sub">+ Publish Event</button>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Date & Time</th>
                  <th>Registrations</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${events.map(ev => `
                  <tr>
                    <td><strong>${escapeHtml(ev.title)}</strong></td>
                    <td><span class="status-pill status-available">${escapeHtml(ev.category)}</span></td>
                    <td>📍 ${escapeHtml(ev.location)}</td>
                    <td>${ev.event_date} at ${ev.event_time}</td>
                    <td>👥 <strong>${ev.registration_count}</strong> registered</td>
                    <td>
                      <button class="btn btn-outline btn-sm btn-delete-event" data-event-id="${ev.id}" style="color: var(--danger); border-color: rgba(239, 68, 68, 0.4);">
                        Delete
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;

        const addBtn = document.getElementById('btn-admin-add-event-sub');
        if (addBtn) addBtn.addEventListener('click', () => openModal('create-event-modal'));

        container.querySelectorAll('.btn-delete-event').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to delete this event?')) return;
            const eventId = parseInt(btn.dataset.eventId, 10);
            try {
              await API.events.delete(eventId);
              showToast('Event deleted successfully.', 'success');
              loadAdminPanel();
            } catch (err) {
              showToast(err.message, 'error');
            }
          });
        });
      } else if (activeAdminSubtab === 'canteen') {
        const menu = await API.canteen.getMenu();
        container.innerHTML = `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Price (₹)</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${menu.map(item => `
                  <tr>
                    <td><strong>${escapeHtml(item.item)}</strong></td>
                    <td>${escapeHtml(item.category)}</td>
                    <td><strong style="color: var(--secondary);">₹${item.price}</strong></td>
                    <td>
                      <span class="status-pill ${item.available ? 'status-available' : 'status-full'}">
                        ${item.available ? 'In Stock' : 'Sold Out'}
                      </span>
                    </td>
                    <td>
                      <button class="btn ${item.available ? 'btn-secondary' : 'btn-primary'} btn-sm btn-toggle-menu" data-item-id="${item.id}" data-current="${item.available}">
                        ${item.available ? 'Mark Out of Stock' : 'Mark Available'}
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;

        container.querySelectorAll('.btn-toggle-menu').forEach(btn => {
          btn.addEventListener('click', async () => {
            const itemId = parseInt(btn.dataset.itemId, 10);
            const current = btn.dataset.current === '1';
            try {
              await API.canteen.updateMenu(itemId, { available: !current });
              showToast('Menu item updated!', 'success');
              loadAdminPanel();
            } catch (err) {
              showToast(err.message, 'error');
            }
          });
        });
      } else if (activeAdminSubtab === 'places') {
        const places = await API.places.getAll();
        container.innerHTML = `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Spot Name</th>
                  <th>Type</th>
                  <th>Building & Floor</th>
                  <th>Current Status</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                ${places.map(p => `
                  <tr>
                    <td><strong>${escapeHtml(p.name)}</strong></td>
                    <td><span class="status-pill status-low">${escapeHtml(p.type)}</span></td>
                    <td>${escapeHtml(p.building)} (${escapeHtml(p.floor)})</td>
                    <td>
                      <select class="form-select admin-place-status-select" data-place-id="${p.id}" style="width: 130px; padding: 4px 8px; font-size: 12px;">
                        <option value="Available" ${p.status === 'Available' ? 'selected' : ''}>Available</option>
                        <option value="Busy" ${p.status === 'Busy' ? 'selected' : ''}>Busy</option>
                        <option value="Full" ${p.status === 'Full' ? 'selected' : ''}>Full</option>
                      </select>
                    </td>
                    <td><span style="font-size: 12px; color: var(--text-muted);">${escapeHtml(p.relative_updated || 'recently')}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;

        container.querySelectorAll('.admin-place-status-select').forEach(sel => {
          sel.addEventListener('change', async () => {
            const placeId = parseInt(sel.dataset.placeId, 10);
            try {
              await API.places.updateStatus(placeId, sel.value);
              showToast('Place status updated!', 'success');
            } catch (err) {
              showToast(err.message, 'error');
            }
          });
        });
      } else if (activeAdminSubtab === 'bus') {
        const busData = await API.bus.getAll();
        container.innerHTML = `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Destination Corridors</th>
                  <th>Pickup Bay</th>
                  <th>Timings</th>
                  <th>Operating Days</th>
                </tr>
              </thead>
              <tbody>
                ${busData.routes.map(r => `
                  <tr>
                    <td><strong>${escapeHtml(r.route_number)}</strong></td>
                    <td>${escapeHtml(r.destination)}</td>
                    <td>📍 ${escapeHtml(r.pickup_point)}</td>
                    <td>${escapeHtml(r.timings)}</td>
                    <td>${escapeHtml(r.active_days)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      } else if (activeAdminSubtab === 'contacts') {
        const contacts = await API.contacts.getAll();
        container.innerHTML = `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Emergency Service</th>
                  <th>Contact Number</th>
                  <th>Campus Location</th>
                  <th>Operating Hours</th>
                  <th>Dial</th>
                </tr>
              </thead>
              <tbody>
                ${contacts.map(c => `
                  <tr>
                    <td><strong>${escapeHtml(c.title)}</strong></td>
                    <td><span style="color: var(--secondary); font-weight: 700;">${escapeHtml(c.number)}</span></td>
                    <td>${escapeHtml(c.location)}</td>
                    <td><span class="status-pill status-available">${escapeHtml(c.available_hours || '24x7')}</span></td>
                    <td>
                      <a href="tel:${escapeHtml(c.number.replace(/\\s+/g, ''))}" class="btn btn-primary btn-sm" style="background: var(--danger);">
                        📞 Call
                      </a>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    } catch (e) {
      container.innerHTML = `<div class="empty-state"><div class="empty-title">Error in admin panel</div><div class="empty-desc">${e.message}</div></div>`;
    }
  }

  // ==========================================
  // SEARCH FEATURE (Unified: Places, Events, Lost Items)
  // ==========================================
  async function performSearch(query) {
    if (!query || query.trim().length < 2) return;
    const cleanQuery = query.trim();

    const resultsContainer = document.getElementById('search-modal-results');
    resultsContainer.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
    openModal('search-modal');

    try {
      const data = await API.search(cleanQuery);

      if (data.totalResults === 0) {
        resultsContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-title">No results found</div>
            <div class="empty-desc">No places, events, or lost items matched '${escapeHtml(cleanQuery)}'.</div>
          </div>
        `;
        return;
      }

      let html = '';

      // Matching Places
      if (data.places.length > 0) {
        html += `<h4 style="font-size: 14px; font-weight: 700; color: var(--secondary); margin: 8px 0;">Places (${data.places.length})</h4>`;
        html += data.places.map(p => `
          <div class="item-card" style="margin-bottom: 8px;">
            <div class="card-top">
              <div>
                <strong style="font-size: 14px;">${escapeHtml(p.name)}</strong>
                <div class="card-meta"><span>${escapeHtml(p.building)} • ${escapeHtml(p.floor)}</span></div>
              </div>
              <span class="status-pill ${getStatusClass(p.status)}">${p.status}</span>
            </div>
            <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">${escapeHtml(p.description || '')}</p>
            <button class="btn btn-secondary btn-sm" onclick="API_HELPERS.viewDirections(${p.id})">Directions</button>
          </div>
        `).join('');
      }

      // Matching Events
      if (data.events.length > 0) {
        html += `<h4 style="font-size: 14px; font-weight: 700; color: var(--primary-light); margin: 16px 0 8px;">Events (${data.events.length})</h4>`;
        html += data.events.map(ev => `
          <div class="item-card" style="margin-bottom: 8px;">
            <div class="card-top">
              <div>
                <strong style="font-size: 14px;">${escapeHtml(ev.title)}</strong>
                <div class="card-meta"><span>${ev.event_date} at ${ev.event_time}</span></div>
              </div>
              <span class="status-pill status-available">${escapeHtml(ev.category)}</span>
            </div>
            <p style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(ev.description || '')}</p>
          </div>
        `).join('');
      }

      // Matching Lost & Found
      if (data.lost_found.length > 0) {
        html += `<h4 style="font-size: 14px; font-weight: 700; color: var(--warning); margin: 16px 0 8px;">Lost & Found (${data.lost_found.length})</h4>`;
        html += data.lost_found.map(item => `
          <div class="item-card" style="margin-bottom: 8px;">
            <div class="card-top">
              <div>
                <strong style="font-size: 14px;">${escapeHtml(item.title)}</strong>
                <div class="card-meta"><span>${item.type} • ${escapeHtml(item.location)}</span></div>
              </div>
              <span class="status-pill ${getStatusClass(item.status)}">${item.status}</span>
            </div>
            <p style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(item.description || '')}</p>
          </div>
        `).join('');
      }

      resultsContainer.innerHTML = html;
    } catch (e) {
      resultsContainer.innerHTML = `<div class="empty-state"><div class="empty-title">Search error</div><div class="empty-desc">${e.message}</div></div>`;
    }
  }

  // Window helper for inline handlers
  window.API_HELPERS = {
    viewDirections: (id) => {
      closeModal('search-modal');
      showDirectionsModal(id);
    }
  };

  // Helper utility for sanitization
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================
  // EVENT LISTENERS INITIALIZATION
  // ==========================================
  function initEventListeners() {
    // 1. Navigation items click
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        showView(view);
      });
    });

    // 2. Brand header & sidebar click -> Home
    const brandBtn = document.getElementById('brand-home-btn');
    if (brandBtn) {
      brandBtn.addEventListener('click', () => showView('home'));
    }
    const sidebarBrandBtn = document.getElementById('sidebar-brand-btn');
    if (sidebarBrandBtn) {
      sidebarBrandBtn.addEventListener('click', () => showView('home'));
    }

    // 3. User account header & sidebar button -> Open auth modal
    const authBtn = document.getElementById('header-auth-btn');
    if (authBtn) {
      authBtn.addEventListener('click', () => {
        openModal('auth-modal');
      });
    }

    const sidebarUserSection = document.getElementById('sidebar-user-section');
    if (sidebarUserSection) {
      sidebarUserSection.addEventListener('click', () => {
        openModal('auth-modal');
      });
    }

    const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');
    if (sidebarLogoutBtn) {
      sidebarLogoutBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        API.setToken(null);
        API.setUser(null);
        updateAuthUI();
        showToast('You have been logged out.', 'info');
        loadTodayFeed();
        if (state.currentView === 'issues') loadIssues();
        if (state.currentView === 'events') loadEvents();
        if (state.currentView === 'admin') showView('home');
      });
    }

    // 4. Close modal buttons
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const backdrop = btn.closest('.modal-backdrop');
        if (backdrop) backdrop.classList.remove('active');
      });
    });

    // Close on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });

    // 5. Near Me Chips on Home
    const chipsContainer = document.getElementById('near-me-chips');
    if (chipsContainer) {
      chipsContainer.querySelectorAll('.chip-btn').forEach(chip => {
        chip.addEventListener('click', () => {
          chipsContainer.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          const type = chip.dataset.type;
          loadNearMePlaces(type);
        });
      });
    }

    // 6. Places view filter chips
    const placesChips = document.getElementById('places-filter-chips');
    if (placesChips) {
      placesChips.querySelectorAll('.chip-btn').forEach(chip => {
        chip.addEventListener('click', () => {
          placesChips.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          const type = chip.dataset.type;
          loadPlaces(type);
        });
      });
    }

    // 7. Today tile clicks -> Navigate to corresponding view
    document.getElementById('today-event-tile').addEventListener('click', () => showView('events'));
    document.getElementById('today-canteen-tile').addEventListener('click', () => showView('canteen'));
    document.getElementById('today-bus-tile').addEventListener('click', () => showView('bus'));
    document.getElementById('today-issues-tile').addEventListener('click', () => {
      state.selectedIssueTab = 'mine';
      document.querySelectorAll('#issues-subtabs .sub-tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === 'mine');
      });
      showView('issues');
    });

    // 8. Quick Action buttons on Home
    document.getElementById('qa-report-issue').addEventListener('click', () => {
      if (!state.currentUser) {
        showToast('Please log in to report issues.', 'info');
        openModal('auth-modal');
        return;
      }
      if (window.innerWidth >= 1024) {
        showView('issues');
        const block = document.getElementById('issue-block');
        if (block) block.focus();
      } else {
        openModal('report-issue-modal');
      }
    });
    document.getElementById('qa-canteen').addEventListener('click', () => showView('canteen'));
    document.getElementById('qa-lostfound').addEventListener('click', () => showView('lostfound'));
    document.getElementById('qa-emergency').addEventListener('click', () => showView('contacts'));

    // 9. More view menu buttons
    document.getElementById('menu-btn-canteen').addEventListener('click', () => showView('canteen'));
    document.getElementById('menu-btn-bus').addEventListener('click', () => showView('bus'));
    document.getElementById('menu-btn-lostfound').addEventListener('click', () => showView('lostfound'));
    document.getElementById('menu-btn-emergency').addEventListener('click', () => showView('contacts'));
    document.getElementById('menu-btn-admin').addEventListener('click', () => showView('admin'));

    // 10. Search input
    const searchInput = document.getElementById('home-search-input');
    const searchClear = document.getElementById('search-clear-btn');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          performSearch(searchInput.value);
        }
      });
      searchInput.addEventListener('input', () => {
        if (searchClear) searchClear.classList.toggle('visible', searchInput.value.length > 0);
      });
    }
    if (searchClear) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchClear.classList.remove('visible');
      });
    }

    // 11. Auth Form Tabs (Login vs Signup)
    const tabLogin = document.getElementById('tab-login-btn');
    const tabSignup = document.getElementById('tab-signup-btn');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      loginForm.style.display = 'block';
      signupForm.style.display = 'none';
    });

    tabSignup.addEventListener('click', () => {
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      signupForm.style.display = 'block';
      loginForm.style.display = 'none';
    });

    // 12. Login Form Submit
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-password').value;

      try {
        const res = await API.auth.login(email, pass);
        API.setToken(res.token);
        API.setUser(res.user);
        updateAuthUI();
        closeModal('auth-modal');
        showToast(`Welcome back, ${res.user.name}!`, 'success');
        loadTodayFeed();
        if (state.currentView === 'issues') loadIssues();
        if (state.currentView === 'events') loadEvents();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // 13. Signup Form Submit
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value;
      const email = document.getElementById('signup-email').value;
      const pass = document.getElementById('signup-password').value;

      try {
        const res = await API.auth.signup(name, email, pass);
        API.setToken(res.token);
        API.setUser(res.user);
        updateAuthUI();
        closeModal('auth-modal');
        showToast(`Account created! Welcome, ${res.user.name}.`, 'success');
        loadTodayFeed();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // 14. Demo Quick Login Shortcuts
    document.getElementById('quick-login-student').addEventListener('click', async () => {
      try {
        const res = await API.auth.login('student@campus.com', 'student123');
        API.setToken(res.token);
        API.setUser(res.user);
        updateAuthUI();
        closeModal('auth-modal');
        showToast('Logged in as Demo Student (Aarav)', 'success');
        loadTodayFeed();
        if (state.currentView === 'issues') loadIssues();
        if (state.currentView === 'events') loadEvents();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    document.getElementById('quick-login-admin').addEventListener('click', async () => {
      try {
        const res = await API.auth.login('admin@campus.com', 'admin123');
        API.setToken(res.token);
        API.setUser(res.user);
        updateAuthUI();
        closeModal('auth-modal');
        showToast('Logged in as Campus Administrator', 'success');
        loadTodayFeed();
        if (state.currentView === 'issues') loadIssues();
        if (state.currentView === 'events') loadEvents();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // 15. Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
      API.setToken(null);
      API.setUser(null);
      updateAuthUI();
      closeModal('auth-modal');
      showToast('You have been logged out.', 'info');
      loadTodayFeed();
      if (state.currentView === 'issues') loadIssues();
      if (state.currentView === 'events') loadEvents();
      if (state.currentView === 'admin') showView('home');
    });

    // 16. Update Place Status Modal buttons
    ['Available', 'Busy', 'Full'].forEach(status => {
      const btn = document.getElementById(`btn-status-${status.toLowerCase()}`);
      if (btn) {
        btn.addEventListener('click', async () => {
          const placeId = parseInt(document.getElementById('status-target-place-id').value, 10);
          try {
            await API.places.updateStatus(placeId, status);
            closeModal('update-place-status-modal');
            showToast(`Spot marked as ${status}!`, 'success');
            if (state.currentView === 'home') {
              loadNearMePlaces(state.selectedNearMeChip);
            } else if (state.currentView === 'places') {
              loadPlaces(state.selectedPlacesChip);
            }
          } catch (err) {
            showToast(err.message, 'error');
          }
        });
      }
    });

    // 17. Report Issue Forms (Desktop inline + Mobile Modal)
    const reportModalTrigger = document.getElementById('open-report-issue-modal-btn');
    if (reportModalTrigger) {
      reportModalTrigger.addEventListener('click', () => {
        if (!state.currentUser) {
          showToast('Please log in to report issues.', 'info');
          openModal('auth-modal');
          return;
        }
        openModal('report-issue-modal');
      });
    }

    // Desktop Inline Form
    const reportIssueForm = document.getElementById('report-issue-form');
    if (reportIssueForm) {
      reportIssueForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!state.currentUser) {
          showToast('Please log in to report issues.', 'info');
          openModal('auth-modal');
          return;
        }

        const block = document.getElementById('issue-block').value;
        const category = document.getElementById('issue-category').value;
        const description = document.getElementById('issue-description').value;
        const photoFile = document.getElementById('issue-photo').files[0];

        const formData = new FormData();
        formData.append('block', block);
        formData.append('category', category);
        formData.append('description', description);
        if (photoFile) {
          formData.append('photo', photoFile);
        }

        const submitBtn = document.getElementById('submit-issue-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Submitting...';
        }

        try {
          const res = await API.issues.create(formData);
          reportIssueForm.reset();
          showToast(`Issue #${res.id} reported successfully!`, 'success');
          loadIssues();
          loadTodayFeed();
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Issue Report';
          }
        }
      });
    }

    // Mobile / Modal Form
    const modalReportIssueForm = document.getElementById('modal-report-issue-form');
    if (modalReportIssueForm) {
      modalReportIssueForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!state.currentUser) {
          showToast('Please log in to report issues.', 'info');
          openModal('auth-modal');
          return;
        }

        const block = document.getElementById('modal-issue-block').value;
        const category = document.getElementById('modal-issue-category').value;
        const description = document.getElementById('modal-issue-description').value;
        const photoFile = document.getElementById('modal-issue-photo').files[0];

        const formData = new FormData();
        formData.append('block', block);
        formData.append('category', category);
        formData.append('description', description);
        if (photoFile) {
          formData.append('photo', photoFile);
        }

        const submitBtn = document.getElementById('modal-submit-issue-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Submitting...';
        }

        try {
          const res = await API.issues.create(formData);
          closeModal('report-issue-modal');
          modalReportIssueForm.reset();
          showToast(`Issue #${res.id} reported successfully!`, 'success');
          loadIssues();
          loadTodayFeed();
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Report';
          }
        }
      });
    }

    // 18. Issue Subtabs (All vs Mine)
    document.querySelectorAll('#issues-subtabs .sub-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#issues-subtabs .sub-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedIssueTab = btn.dataset.tab;
        loadIssues();
      });
    });

    // 19. Events Group Tabs (All / Today / Tomorrow / Later)
    document.querySelectorAll('#events-group-tabs .sub-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#events-group-tabs .sub-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedEventGroup = btn.dataset.group;
        loadEvents();
      });
    });

    // 20. Admin Create Event Form
    const adminEventBtn = document.getElementById('admin-create-event-btn');
    if (adminEventBtn) {
      adminEventBtn.addEventListener('click', () => openModal('create-event-modal'));
    }

    const createEventForm = document.getElementById('create-event-form');
    if (createEventForm) {
      createEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('ev-title').value;
        const category = document.getElementById('ev-category').value;
        const location = document.getElementById('ev-location').value;
        const date = document.getElementById('ev-date').value;
        const time = document.getElementById('ev-time').value;
        const desc = document.getElementById('ev-desc').value;

        try {
          await API.events.create({
            title,
            category,
            location,
            event_date: date,
            event_time: time,
            description: desc
          });
          closeModal('create-event-modal');
          createEventForm.reset();
          showToast('New campus event created!', 'success');
          loadEvents();
          loadTodayFeed();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // 21. Canteen Crowd Voting Buttons
    document.getElementById('vote-crowd-low').addEventListener('click', () => voteCanteenCrowd('Low'));
    document.getElementById('vote-crowd-med').addEventListener('click', () => voteCanteenCrowd('Medium'));
    document.getElementById('vote-crowd-high').addEventListener('click', () => voteCanteenCrowd('High'));

    // 22. Lost & Found Filter Tabs
    document.querySelectorAll('#lf-type-tabs .sub-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#lf-type-tabs .sub-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedLfType = btn.dataset.type;
        loadLostFoundData();
      });
    });

    // 23. Post Lost & Found Item Form
    document.getElementById('open-post-lf-modal-btn').addEventListener('click', () => {
      if (!state.currentUser) {
        showToast('Please log in to post items.', 'info');
        openModal('auth-modal');
        return;
      }
      openModal('post-lf-modal');
    });

    const postLfForm = document.getElementById('post-lf-form');
    if (postLfForm) {
      postLfForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('lf-type').value;
        const title = document.getElementById('lf-title').value;
        const category = document.getElementById('lf-category').value;
        const location = document.getElementById('lf-location').value;
        const description = document.getElementById('lf-description').value;
        const contact = document.getElementById('lf-contact').value;
        const photoFile = document.getElementById('lf-photo').files[0];

        const formData = new FormData();
        formData.append('type', type);
        formData.append('title', title);
        formData.append('category', category);
        formData.append('location', location);
        formData.append('description', description);
        formData.append('contact_info', contact);
        if (photoFile) {
          formData.append('photo', photoFile);
        }

        const submitBtn = document.getElementById('submit-lf-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';

        try {
          await API.lostfound.create(formData);
          closeModal('post-lf-modal');
          postLfForm.reset();
          showToast('Lost & Found item posted successfully!', 'success');
          loadLostFoundData();
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Post Item';
        }
      });
    }

    // 24. Emergency help quick link to report issue
    const reportFromHelp = document.getElementById('btn-quick-report-from-help');
    if (reportFromHelp) {
      reportFromHelp.addEventListener('click', () => {
        showView('issues');
        document.getElementById('open-report-issue-modal-btn').click();
      });
    }

    // 25. Admin subtabs
    document.querySelectorAll('#admin-subtabs .sub-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#admin-subtabs .sub-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeAdminSubtab = btn.dataset.subtab;
        loadAdminPanel();
      });
    });

    // 26. Auth expired event listener
    window.addEventListener('auth:expired', () => {
      updateAuthUI();
      showToast('Your session has expired. Please log in again.', 'warning');
    });
  }

  // Live Polling every 15 seconds
  function startPolling() {
    if (state.pollingTimer) clearInterval(state.pollingTimer);

    state.pollingTimer = setInterval(() => {
      // Background silent refresh for live data
      loadTodayFeed();

      if (state.currentView === 'canteen') {
        loadCanteenData();
      } else if (state.currentView === 'home') {
        // Silently refresh current near-me cards
        loadNearMePlaces(state.selectedNearMeChip);
      } else if (state.currentView === 'places') {
        loadPlaces(state.selectedPlacesChip);
      } else if (state.currentView === 'issues') {
        loadIssues();
      }
    }, 15000); // 15 seconds
  }

  // App Initialization
  async function init() {
    // 1. Format today's date in header
    const dateEl = document.getElementById('today-date-text');
    if (dateEl) {
      const options = { weekday: 'short', month: 'short', day: 'numeric' };
      dateEl.textContent = new Date().toLocaleDateString(undefined, options);
    }

    // Set default date picker min to today
    const evDateInput = document.getElementById('ev-date');
    if (evDateInput) {
      const todayStr = new Date().toISOString().split('T')[0];
      evDateInput.value = todayStr;
      evDateInput.min = todayStr;
    }

    // 2. Setup event listeners
    initEventListeners();

    // 3. Load config and auth state
    await loadConfig();
    updateAuthUI();

    // 4. Load initial home data
    showView('home');

    // 5. Start 15s live polling
    startPolling();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
