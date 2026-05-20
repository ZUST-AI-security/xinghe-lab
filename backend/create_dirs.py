import os

# Create directories
os.makedirs(r'D:\project\xinghe-lab\backend\app\algorithms', exist_ok=True)
os.makedirs(r'D:\project\xinghe-lab\backend\app\ml_models', exist_ok=True)

# Create __init__.py files with just a newline
with open(r'D:\project\xinghe-lab\backend\app\algorithms\__init__.py', 'w') as f:
    f.write('\n')

with open(r'D:\project\xinghe-lab\backend\app\ml_models\__init__.py', 'w') as f:
    f.write('\n')

# Verify
import os.path
alg_file = r'D:\project\xinghe-lab\backend\app\algorithms\__init__.py'
ml_file = r'D:\project\xinghe-lab\backend\app\ml_models\__init__.py'

print(f"algorithms/__init__.py exists: {os.path.exists(alg_file)}")
print(f"ml_models/__init__.py exists: {os.path.exists(ml_file)}")

if os.path.exists(alg_file):
    with open(alg_file, 'rb') as f:
        content = f.read()
        print(f"algorithms/__init__.py size: {len(content)} bytes")

if os.path.exists(ml_file):
    with open(ml_file, 'rb') as f:
        content = f.read()
        print(f"ml_models/__init__.py size: {len(content)} bytes")
