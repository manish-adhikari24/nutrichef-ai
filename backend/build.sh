#!/usr/bin/env bash
# Render runs this on each deploy.
# Stop straight away if any step fails, so a broken build is never deployed.
set -o errexit
# Install the Python packages listed in requirements.txt.
pip install -r requirements.txt
# Gather static files (for the admin site) so whitenoise can serve them.
python manage.py collectstatic --no-input
# Bring the Neon database tables up to date with the models.
python manage.py migrate --no-input
