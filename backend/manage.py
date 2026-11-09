#!/usr/bin/env python
# Django's command-line tool: runserver, migrate, test, createsuperuser and so on.
import os
import sys


def main():
    # Use this project's settings, then run whatever command was typed.
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nutrichef.settings')
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


# Only run when called directly (python manage.py ...), not when imported.
if __name__ == '__main__':
    main()
