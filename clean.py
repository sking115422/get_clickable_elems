import os
import shutil

def delete_and_remake_dirs(dirs):
    for dir_path in dirs:
        if os.path.exists(dir_path):
            shutil.rmtree(dir_path)
        os.makedirs(dir_path)

if __name__ == "__main__":
    directories = ['./data', './vis']
    delete_and_remake_dirs(directories)
    print("Directories deleted and remade successfully.")
