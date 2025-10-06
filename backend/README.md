# Backend (Django)

This folder will hold the Django REST Framework backend for FinPal.

Recommended quick setup:

1. Create a virtual environment: `python -m venv venv`
2. Activate it: `venv\Scripts\Activate.ps1` (PowerShell)
3. Install deps: `pip install -r requirements.txt`
4. Start project: `django-admin startproject finpal .`

Files to add:
- `requirements.txt`
- `Dockerfile`
- `compose.yml` (optional)
- apps: `expenses`, `users`, `families`
