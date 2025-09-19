// DOM Elements
const authOverlay = document.getElementById('auth-overlay');
const appContainer = document.getElementById('app-container');
const signinForm = document.getElementById('signin-form');
const signupForm = document.getElementById('signup-form');
const goToSignup = document.getElementById('go-to-signup');
const goToSignin = document.getElementById('go-to-signin');
const signinFormData = document.getElementById('signin-form-data');
const signupFormData = document.getElementById('signup-form-data');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.querySelector('.sidebar');
const notificationsBtn = document.getElementById('notifications-btn');
const notificationsPanel = document.getElementById('notifications-panel');
const notificationCount = document.getElementById('notification-count');
const clearNotifications = document.getElementById('clear-notifications');
const notificationToast = document.getElementById('notification-toast');
const closeToast = document.getElementById('close-toast');
const logoutBtn = document.getElementById('logout-btn');
const navItems = document.querySelectorAll('.nav-item');
const contentSections = document.querySelectorAll('.content-section');
const addTaskForm = document.getElementById('add-task-form');
const tasksList = document.getElementById('tasks-list');
const completedList = document.getElementById('completed-list');
const recentTasksList = document.getElementById('recent-tasks-list');
const pendingTasksCount = document.getElementById('pending-tasks-count');
const completedTasksCount = document.getElementById('completed-tasks-count');
const overdueTasksCount = document.getElementById('overdue-tasks-count');
const currentDateEl = document.getElementById('current-date');
const filterBtns = document.querySelectorAll('.filter-btn');

// App State
let currentUser = null;
let tasks = [];
let notifications = [];
let reminderTimeouts = [];

// Initialize the application
function initApp() {
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showApp();
        loadUserData();
    } else {
        showAuth();
    }
    
    // Set current date
    updateDate();
    
    // Set up event listeners
    setupEventListeners();
    
    // Check for notifications every minute
    setInterval(checkForNotifications, 60000);
}

// Set up event listeners
function setupEventListeners() {
    // Auth navigation
    goToSignup.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthForm('signup');
    });
    
    goToSignin.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthForm('signin');
    });
    
    // Form submissions
    signinFormData.addEventListener('submit', handleSignIn);
    signupFormData.addEventListener('submit', handleSignUp);
    
    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    });
    
    // Sidebar toggle
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
    
    // Navigation
    navItems.forEach(item => {
        if (item.id !== 'logout-btn') {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                switchSection(section);
                
                // Close sidebar on mobile after selection
                if (window.innerWidth < 992) {
                    sidebar.classList.remove('open');
                }
            });
        }
    });
    
    // Notifications
    notificationsBtn.addEventListener('click', toggleNotificationsPanel);
    clearNotifications.addEventListener('click', clearAllNotifications);
    closeToast.addEventListener('click', hideToast);
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Add task form
    addTaskForm.addEventListener('submit', handleAddTask);
    
    // Task filters
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterTasks(btn.getAttribute('data-filter'));
        });
    });
}

// Switch between auth forms
function switchAuthForm(form) {
    if (form === 'signup') {
        signinForm.classList.remove('active');
        signupForm.classList.add('active');
    } else {
        signupForm.classList.remove('active');
        signinForm.classList.add('active');
    }
}

// Show authentication UI
function showAuth() {
    authOverlay.classList.remove('hidden');
    appContainer.classList.add('hidden');
}

// Show main application UI
function showApp() {
    authOverlay.classList.add('hidden');
    appContainer.classList.remove('hidden');
}

// Switch between content sections
function switchSection(sectionId) {
    // Hide all sections
    contentSections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Deactivate all nav items
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`${sectionId}-section`).classList.add('active');
    
    // Activate corresponding nav item
    document.querySelector(`.nav-item[data-section="${sectionId}"]`).classList.add('active');
    
    // Load section-specific data
    if (sectionId === 'tasks') {
        renderTasks();
    } else if (sectionId === 'completed') {
        renderCompletedTasks();
    }
}

// Handle sign in
function handleSignIn(e) {
    e.preventDefault();
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    
    // In a real app, this would be an API call
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = {
            id: user.id,
            name: user.name,
            email: user.email
        };
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showApp();
        loadUserData();
        
        // Show welcome notification
        showNotification('Welcome Back!', `Hello ${user.name}, welcome back to TaskMaster!`);
    } else {
        alert('Invalid email or password. Please try again.');
    }
}

// Handle sign up
function handleSignUp(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match.');
        return;
    }
    
    // In a real app, this would be an API call
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Check if user already exists
    if (users.some(u => u.email === email)) {
        alert('User with this email already exists.');
        return;
    }
    
    // Create new user
    const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    currentUser = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
    };
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Initialize user data
    localStorage.setItem(`tasks_${currentUser.id}`, JSON.stringify([]));
    localStorage.setItem(`notifications_${currentUser.id}`, JSON.stringify([]));
    
    showApp();
    loadUserData();
    
    // Show welcome notification
    showNotification('Welcome to TaskMaster!', `Hello ${name}, let's get things done!`);
}

// Handle logout
function handleLogout(e) {
    e.preventDefault();
    currentUser = null;
    localStorage.removeItem('currentUser');
    showAuth();
    
    // Clear any pending reminders
    reminderTimeouts.forEach(timeout => clearTimeout(timeout));
    reminderTimeouts = [];
}

// Load user data
function loadUserData() {
    if (!currentUser) return;
    
    // Load tasks
    tasks = JSON.parse(localStorage.getItem(`tasks_${currentUser.id}`) || '[]');
    
    // Load notifications
    notifications = JSON.parse(localStorage.getItem(`notifications_${currentUser.id}`) || '[]');
    updateNotificationBadge();
    
    // Set up task reminders
    setupTaskReminders();
    
    // Update UI
    updateDashboard();
    renderTasks();
    renderCompletedTasks();
    renderRecentTasks();
    
    // Set username and avatar
    document.getElementById('username').textContent = currentUser.name;
    document.getElementById('user-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=7269ef&color=fff`;
}

// Update dashboard stats
function updateDashboard() {
    const pendingTasks = tasks.filter(task => !task.completed && !isOverdue(task));
    const completedTasks = tasks.filter(task => task.completed);
    const overdueTasks = tasks.filter(task => !task.completed && isOverdue(task));
    
    pendingTasksCount.textContent = pendingTasks.length;
    completedTasksCount.textContent = completedTasks.length;
    overdueTasksCount.textContent = overdueTasks.length;
}

// Render tasks
function renderTasks() {
    if (!tasksList) return;
    
    const pendingTasks = tasks.filter(task => !task.completed);
    
    if (pendingTasks.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>No tasks yet</h3>
                <p>You don't have any pending tasks. Add a new task to get started!</p>
            </div>
        `;
        return;
    }
    
    tasksList.innerHTML = pendingTasks.map(task => createTaskHTML(task)).join('');
    
    // Add event listeners to task actions
    document.querySelectorAll('.task-checkbox input').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const taskId = this.closest('.task-item').dataset.taskId;
            completeTask(taskId);
        });
    });
    
    document.querySelectorAll('.task-delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const taskId = this.closest('.task-item').dataset.taskId;
            deleteTask(taskId);
        });
    });
}

// Render completed tasks
function renderCompletedTasks() {
    if (!completedList) return;
    
    const completedTasks = tasks.filter(task => task.completed);
    
    if (completedTasks.length === 0) {
        completedList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h3>No completed tasks</h3>
                <p>You haven't completed any tasks yet.</p>
            </div>
        `;
        return;
    }
    
    completedList.innerHTML = completedTasks.map(task => createTaskHTML(task, true)).join('');
}

// Render recent tasks
function renderRecentTasks() {
    if (!recentTasksList) return;
    
    const recentTasks = tasks
        .filter(task => !task.completed)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
    
    if (recentTasks.length === 0) {
        recentTasksList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>No tasks yet</h3>
                <p>Add your first task to get started!</p>
            </div>
        `;
        return;
    }
    
    recentTasksList.innerHTML = recentTasks.map(task => createTaskHTML(task)).join('');
    
    // Add event listeners to task actions
    document.querySelectorAll('#recent-tasks-list .task-checkbox input').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const taskId = this.closest('.task-item').dataset.taskId;
            completeTask(taskId);
        });
    });
}

// Create task HTML
function createTaskHTML(task, isCompleted = false) {
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const formattedDate = dueDate ? dueDate.toLocaleDateString() + ' ' + dueDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'No due date';
    
    return `
        <div class="task-item" data-task-id="${task.id}">
            <div class="task-checkbox">
                <input type="checkbox" ${isCompleted ? 'checked' : ''}>
            </div>
            <div class="task-content">
                <div class="task-title">
                    <span>${task.title}</span>
                    <span class="task-priority priority-${task.priority}">${task.priority}</span>
                </div>
                ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                <div class="task-meta">
                    <span><i class="fas fa-calendar"></i> ${formattedDate}</span>
                </div>
            </div>
            <div class="task-actions">
                ${!isCompleted ? `
                    <button class="task-action-btn task-complete" title="Complete">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}
                <button class="task-action-btn task-delete" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// Handle add task
function handleAddTask(e) {
    e.preventDefault();
    
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const dueDate = document.getElementById('task-due-date').value;
    const priority = document.getElementById('task-priority').value;
    const setReminder = document.getElementById('task-reminder').checked;
    
    const newTask = {
        id: Date.now().toString(),
        title,
        description,
        dueDate: dueDate || null,
        priority,
        reminder: setReminder,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(newTask);
    saveTasks();
    
    // Set up reminder if needed
    if (setReminder && dueDate) {
        setTaskReminder(newTask);
    }
    
    // Update UI
    updateDashboard();
    renderTasks();
    renderRecentTasks();
    
    // Reset form
    addTaskForm.reset();
    
    // Show confirmation
    showNotification('Task Added', `"${title}" has been added to your tasks.`);
}

// Complete a task
function completeTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = true;
        task.completedAt = new Date().toISOString();
        saveTasks();
        
        // Update UI
        updateDashboard();
        renderTasks();
        renderCompletedTasks();
        renderRecentTasks();
        
        // Show notification
        showNotification('Task Completed', `"${task.title}" has been marked as completed.`);
    }
}

// Delete a task
function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(t => t.id !== taskId);
        saveTasks();
        
        // Update UI
        updateDashboard();
        renderTasks();
        renderCompletedTasks();
        renderRecentTasks();
        
        // Show notification
        showNotification('Task Deleted', 'The task has been deleted.');
    }
}

// Save tasks to localStorage
function saveTasks() {
    if (!currentUser) return;
    localStorage.setItem(`tasks_${currentUser.id}`, JSON.stringify(tasks));
}

// Filter tasks
function filterTasks(filter) {
    let filteredTasks = tasks.filter(task => !task.completed);
    
    switch (filter) {
        case 'today':
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            filteredTasks = filteredTasks.filter(task => {
                if (!task.dueDate) return false;
                const dueDate = new Date(task.dueDate);
                return dueDate >= today && dueDate < tomorrow;
            });
            break;
            
        case 'week':
            const startOfWeek = new Date();
            startOfWeek.setHours(0, 0, 0, 0);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 7);
            
            filteredTasks = filteredTasks.filter(task => {
                if (!task.dueDate) return false;
                const dueDate = new Date(task.dueDate);
                return dueDate >= startOfWeek && dueDate < endOfWeek;
            });
            break;
            
        case 'important':
            filteredTasks = filteredTasks.filter(task => task.priority === 'high');
            break;
    }
    
    if (filteredTasks.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>No tasks found</h3>
                <p>No tasks match your filter criteria.</p>
            </div>
        `;
    } else {
        tasksList.innerHTML = filteredTasks.map(task => createTaskHTML(task)).join('');
        
        // Add event listeners to task actions
        document.querySelectorAll('.task-checkbox input').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const taskId = this.closest('.task-item').dataset.taskId;
                completeTask(taskId);
            });
        });
        
        document.querySelectorAll('.task-delete').forEach(btn => {
            btn.addEventListener('click', function() {
                const taskId = this.closest('.task-item').dataset.taskId;
                deleteTask(taskId);
            });
        });
    }
}

// Set up task reminders
function setupTaskReminders() {
    // Clear any existing timeouts
    reminderTimeouts.forEach(timeout => clearTimeout(timeout));
    reminderTimeouts = [];
    
    // Set up reminders for tasks that need them
    tasks.forEach(task => {
        if (task.reminder && task.dueDate && !task.completed) {
            setTaskReminder(task);
        }
    });
}

// Set a reminder for a task
function setTaskReminder(task) {
    const dueDate = new Date(task.dueDate);
    const reminderTime = new Date(dueDate.getTime() - 20 * 60000); // 20 minutes before
    
    // If the reminder time is in the future
    if (reminderTime > new Date()) {
        const timeout = setTimeout(() => {
            showNotification('Task Reminder', `"${task.title}" is due in 20 minutes!`);
            
            // Add to notifications list
            const notification = {
                id: Date.now().toString(),
                title: 'Task Reminder',
                message: `"${task.title}" is due in 20 minutes!`,
                timestamp: new Date().toISOString(),
                read: false
            };
            
            notifications.unshift(notification);
            saveNotifications();
            updateNotificationBadge();
        }, reminderTime - new Date());
        
        reminderTimeouts.push(timeout);
    }
}

// Check if a task is overdue
function isOverdue(task) {
    if (!task.dueDate || task.completed) return false;
    return new Date(task.dueDate) < new Date();
}

// Toggle notifications panel
function toggleNotificationsPanel() {
    notificationsPanel.classList.toggle('hidden');
    
    // Mark notifications as read when panel is opened
    if (!notificationsPanel.classList.contains('hidden')) {
        notifications.forEach(notification => {
            notification.read = true;
        });
        saveNotifications();
        updateNotificationBadge();
        renderNotifications();
    }
}

// Render notifications
function renderNotifications() {
    const notificationsList = document.getElementById('notifications-list');
    
    if (notifications.length === 0) {
        notificationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <h3>No notifications</h3>
                <p>You don't have any notifications yet.</p>
            </div>
        `;
        return;
    }
    
    notificationsList.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.read ? '' : 'unread'}">
            <div class="notification-title">${notification.title}</div>
            <div class="notification-message">${notification.message}</div>
            <div class="notification-time">${formatTime(new Date(notification.timestamp))}</div>
        </div>
    `).join('');
}

// Clear all notifications
function clearAllNotifications() {
    notifications = [];
    saveNotifications();
    updateNotificationBadge();
    renderNotifications();
}

// Save notifications to localStorage
function saveNotifications() {
    if (!currentUser) return;
    localStorage.setItem(`notifications_${currentUser.id}`, JSON.stringify(notifications));
}

// Update notification badge
function updateNotificationBadge() {
    const unreadCount = notifications.filter(n => !n.read).length;
    
    if (unreadCount > 0) {
        notificationCount.textContent = unreadCount;
        notificationCount.classList.remove('hidden');
    } else {
        notificationCount.classList.add('hidden');
    }
}

// Show notification toast
function showNotification(title, message) {
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-message').textContent = message;
    
    notificationToast.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        hideToast();
    }, 5000);
}

// Hide notification toast
function hideToast() {
    notificationToast.classList.add('hidden');
}

// Check for notifications (due tasks, etc.)
function checkForNotifications() {
    // Check for overdue tasks
    const overdueTasks = tasks.filter(task => isOverdue(task) && !task.notified);
    
    overdueTasks.forEach(task => {
        showNotification('Task Overdue', `"${task.title}" is overdue!`);
        task.notified = true;
    });
    
    if (overdueTasks.length > 0) {
        saveTasks();
    }
}

// Update current date display
function updateDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateEl.textContent = now.toLocaleDateString('en-US', options);
}

// Format time for display
function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);