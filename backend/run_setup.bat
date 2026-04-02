@echo off
cd /d D:\project\xinghe-lab\backend
python setup_dirs.py
if errorlevel 1 (
    echo python failed, trying python3...
    python3 setup_dirs.py
    if errorlevel 1 (
        echo python3 failed, trying py...
        py setup_dirs.py
    )
)
