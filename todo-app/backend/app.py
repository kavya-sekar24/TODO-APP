from flask import Flask, request, jsonify, session
from flask_cors import CORS
from datetime import datetime, timedelta
import json
import os
from models import db, User, Task, Notification

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///todoapp.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
db.init_app(app)

# Enable CORS
CORS(app, supports_credentials=True)

# Create tables
with app.app_context():
    db.create_all()

# Helper function to get current user
def get_current_user():
    if 'user_id' in session:
        return User.query.get(session['user_id'])
    return None

# Auth routes
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()
    
    # Check if user already exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'User with this email already exists'}), 400
    
    # Create new user
    new_user = User(
        name=data['name'],
        email=data['email'],
        password=data['password']  # In production, hash the password
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    # Log the user in
    session['user_id'] = new_user.id
    
    return jsonify({
        'message': 'User created successfully',
        'user': {
            'id': new_user.id,
            'name': new_user.name,
            'email': new_user.email
        }
    }), 201

@app.route('/api/signin', methods=['POST'])
def signin():
    data = request.get_json()
    
    # Find user by email and password
    user = User.query.filter_by(
        email=data['email'], 
        password=data['password']  # In production, use password hashing
    ).first()
    
    if not user:
        return jsonify({'error': 'Invalid email or password'}), 401
    
    # Log the user in
    session['user_id'] = user.id
    
    return jsonify({
        'message': 'Signed in successfully',
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email
        }
    })

@app.route('/api/signout', methods=['POST'])
def signout():
    session.pop('user_id', None)
    return jsonify({'message': 'Signed out successfully'})

# Task routes
@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    
    tasks = Task.query.filter_by(user_id=user.id).all()
    
    return jsonify({
        'tasks': [task.to_dict() for task in tasks]
    })

@app.route('/api/tasks', methods=['POST'])
def create_task():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.get_json()
    
    # Parse due date if provided
    due_date = None
    if data.get('dueDate'):
        due_date = datetime.fromisoformat(data['dueDate'].replace('Z', '+00:00'))
    
    new_task = Task(
        title=data['title'],
        description=data.get('description', ''),
        due_date=due_date,
        priority=data.get('priority', 'medium'),
        reminder=data.get('reminder', False),
        user_id=user.id
    )
    
    db.session.add(new_task)
    db.session.commit()
    
    # Schedule reminder if needed
    if new_task.reminder and new_task.due_date:
        schedule_reminder(new_task)
    
    return jsonify({
        'message': 'Task created successfully',
        'task': new_task.to_dict()
    }), 201

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    
    task = Task.query.filter_by(id=task_id, user_id=user.id).first()
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    
    data = request.get_json()
    
    # Update task fields
    if 'title' in data:
        task.title = data['title']
    if 'description' in data:
        task.description = data['description']
    if 'dueDate' in data:
        task.due_date = datetime.fromisoformat(data['dueDate'].replace('Z', '+00:00')) if data['dueDate'] else None
    if 'priority' in data:
        task.priority = data['priority']
    if 'reminder' in data:
        task.reminder = data['reminder']
    if 'completed' in data:
        task.completed = data['completed']
        if data['completed']:
            task.completed_at = datetime.utcnow()
    
    db.session.commit()
    
    # Reschedule reminder if needed
    if task.reminder and task.due_date:
        schedule_reminder(task)
    
    return jsonify({
        'message': 'Task updated successfully',
        'task': task.to_dict()
    })

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    
    task = Task.query.filter_by(id=task_id, user_id=user.id).first()
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    
    db.session.delete(task)
    db.session.commit()
    
    return jsonify({'message': 'Task deleted successfully'})

# Notification routes
@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    
    notifications = Notification.query.filter_by(user_id=user.id).order_by(Notification.timestamp.desc()).all()
    
    return jsonify({
        'notifications': [notification.to_dict() for notification in notifications]
    })

@app.route('/api/notifications/<int:notification_id>', methods=['PUT'])
def mark_notification_read(notification_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    
    notification = Notification.query.filter_by(id=notification_id, user_id=user.id).first()
    if not notification:
        return jsonify({'error': 'Notification not found'}), 404
    
    notification.read = True
    db.session.commit()
    
    return jsonify({'message': 'Notification marked as read'})

@app.route('/api/notifications', methods=['DELETE'])
def clear_notifications():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    
    Notification.query.filter_by(user_id=user.id).delete()
    db.session.commit()
    
    return jsonify({'message': 'Notifications cleared'})

# Helper function to schedule reminders
def schedule_reminder(task):
    # In a production app, you would use a task queue like Celery
    # or APScheduler to handle reminders
    
    # For this example, we'll just create a notification
    # that will be checked by the frontend
    
    reminder_time = task.due_date - timedelta(minutes=20)
    
    if reminder_time > datetime.utcnow():
        # Create a pending notification
        reminder = Notification(
            title='Task Reminder',
            message=f'"{task.title}" is due in 20 minutes!',
            scheduled_time=reminder_time,
            user_id=task.user_id
        )
        
        db.session.add(reminder)
        db.session.commit()

# Check for due reminders
@app.route('/api/check-reminders', methods=['POST'])
def check_reminders():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    
    now = datetime.utcnow()
    
    # Find reminders that are due
    due_reminders = Notification.query.filter(
        Notification.user_id == user.id,
        Notification.scheduled_time <= now,
        Notification.sent == False
    ).all()
    
    notifications = []
    
    for reminder in due_reminders:
        # Mark as sent
        reminder.sent = True
        reminder.timestamp = now
        
        # Add to notifications list
        notifications.append(reminder.to_dict())
    
    db.session.commit()
    
    return jsonify({
        'notifications': notifications
    })

if __name__ == '__main__':
    app.run(debug=True)