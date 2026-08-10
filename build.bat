@echo off
REM Build script for VTOCollector
python -m py_compile main.py login.py dashboard.py workqueue.py profile.py api.py session.py config.py
echo Build complete.
