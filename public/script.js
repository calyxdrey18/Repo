document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const form = document.getElementById('groupForm');
  const searchInput = document.getElementById('searchInput');
  const groupList = document.getElementById('groupList');
  const formMsg = document.getElementById('formMsg');
  const groupImageInput = document.getElementById('groupImage');
  const previewImg = document.getElementById('previewImg');

  // Image preview handler
  groupImageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        previewImg.src = event.target.result;
        previewImg.style.display = 'block';
      };
      
      reader.readAsDataURL(file);
    } else {
      previewImg.style.display = 'none';
    }
  });

  // Form submission handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setFormLoading(true);
    
    const formData = {
      username: document.getElementById('username').value.trim(),
      groupName: document.getElementById('groupName').value.trim(),
      groupLink: document.getElementById('groupLink').value.trim(),
      imagePath: previewImg.src || ''
    };

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        showFormMessage('Group added successfully!', 'success');
        form.reset();
        previewImg.style.display = 'none';
        groupImageInput.value = '';
        loadGroups();
      } else {
        showFormMessage(result.error || 'Failed to add group', 'error');
      }
    } catch (error) {
      console.error('Submission error:', error);
      showFormMessage('Network error. Please try again.', 'error');
    } finally {
      setFormLoading(false);
    }
  });

  // Search functionality
  searchInput.addEventListener('input', () => {
    loadGroups(searchInput.value.trim());
  });

  // Load groups from server
  async function loadGroups(searchQuery = '') {
    groupList.innerHTML = '<p class="empty-state">Loading groups...</p>';
    
    try {
      const url = searchQuery 
        ? `/api/groups/search?q=${encodeURIComponent(searchQuery)}`
        : '/api/groups';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const groups = await response.json();
      renderGroups(groups);
    } catch (error) {
      console.error('Error loading groups:', error);
      groupList.innerHTML = '<p class="empty-state">Failed to load groups. Try again later.</p>';
    }
  }

  // Render groups to the DOM
  function renderGroups(groups) {
    if (groups.length === 0) {
      groupList.innerHTML = '<p class="empty-state">No groups found. Be the first to add one!</p>';
      return;
    }

    groupList.innerHTML = '';
    groups.forEach(group => {
      const card = document.createElement('article');
      card.className = 'group-card';
      card.innerHTML = `
        <div class="group-img">
          <img src="${escapeHtml(group.imagePath)}" alt="${escapeHtml(group.groupName)}">
        </div>
        <div class="group-info">
          <h2 class="group-name">${escapeHtml(group.groupName)}</h2>
          <p class="group-user">Shared by: ${escapeHtml(group.username)}</p>
          <a href="${escapeHtml(group.groupLink)}" class="group-link" target="_blank" rel="noopener noreferrer">
            Join Group
          </a>
        </div>
      `;
      groupList.appendChild(card);
    });
  }

  // Helper functions
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showFormMessage(message, type) {
    formMsg.textContent = message;
    formMsg.className = type;
  }

  function setFormLoading(isLoading) {
    if (isLoading) {
      form.classList.add('loading');
      form.querySelector('button').disabled = true;
    } else {
      form.classList.remove('loading');
      form.querySelector('button').disabled = false;
    }
  }

  // Initial load
  loadGroups();
});