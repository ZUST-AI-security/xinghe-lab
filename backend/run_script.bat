@echo off
cd /d D:\project\xinghe-lab\backend
python create_dirs.py
if errorlevel 1 (
    echo python failed, trying python3...
    python3 create_dirs.py
    if errorlevel 1 (
        echo python3 failed, trying py...
        py create_dirs.py
    )
)
