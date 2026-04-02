import os
os.makedirs(r'D:\project\xinghe-lab\backend\app\algorithms', exist_ok=True)
os.makedirs(r'D:\project\xinghe-lab\backend\app\ml_models', exist_ok=True)
with open(r'D:\project\xinghe-lab\backend\app\algorithms\__init__.py', 'w') as f:
    f.write('\n')
with open(r'D:\project\xinghe-lab\backend\app\ml_models\__init__.py', 'w') as f:
    f.write('\n')
print('Done')
