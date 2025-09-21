#!/usr/bin/env python3
"""
Fix TOML duplicate entries in all pyproject.toml files
This script removes development dependencies from main dependencies section
"""

import os
import toml
import sys
from pathlib import Path

def fix_pyproject_toml(file_path):
    """Fix a single pyproject.toml file by removing dev dependencies from main dependencies"""
    print(f"🔧 Fixing {file_path}...")
    
    # Backup the original file
    backup_path = f"{file_path}.backup"
    os.system(f'copy "{file_path}" "{backup_path}" >nul 2>&1')
    
    try:
        # Load the TOML file
        with open(file_path, 'r', encoding='utf-8') as f:
            data = toml.load(f)
        
        # Development dependencies that should only be in dev group
        dev_only_deps = {
            'pytest', 'pytest-asyncio', 'pytest-cov', 'pytest-mock', 'pytest-xdist',
            'factory-boy', 'faker', 'black', 'isort', 'flake8', 'mypy', 'bandit',
            'mkdocs', 'mkdocs-material'
        }
        
        # Remove dev dependencies from main dependencies
        if 'tool' in data and 'poetry' in data['tool'] and 'dependencies' in data['tool']['poetry']:
            main_deps = data['tool']['poetry']['dependencies']
            removed_deps = []
            
            for dep in list(main_deps.keys()):
                if dep in dev_only_deps:
                    removed_deps.append(dep)
                    del main_deps[dep]
            
            if removed_deps:
                print(f"   Removed from main dependencies: {', '.join(removed_deps)}")
        
        # Save the fixed TOML file
        with open(file_path, 'w', encoding='utf-8') as f:
            toml.dump(data, f)
        
        # Validate the file
        with open(file_path, 'r', encoding='utf-8') as f:
            toml.load(f)
        
        print(f"✅ Fixed {file_path}")
        return True
        
    except Exception as e:
        print(f"❌ Error fixing {file_path}: {e}")
        # Restore backup
        os.system(f'copy "{backup_path}" "{file_path}" >nul 2>&1')
        return False

def main():
    """Fix all pyproject.toml files in the services directory"""
    print("🔧 Fixing TOML duplicate entries in all services...")
    
    services_dir = Path("touriquest-backend/services")
    if not services_dir.exists():
        print(f"❌ Services directory not found: {services_dir}")
        return 1
    
    services = [
        "admin-service", "ai-service", "analytics-service", "api-gateway",
        "auth-service", "booking-service", "communication-service", 
        "experience-service", "integrations-service", "media-service",
        "monitoring-service", "notification-service", "poi-service",
        "property-service", "recommendation-service"
    ]
    
    fixed_count = 0
    total_count = 0
    
    for service in services:
        toml_file = services_dir / service / "pyproject.toml"
        if toml_file.exists():
            total_count += 1
            if fix_pyproject_toml(str(toml_file)):
                fixed_count += 1
        else:
            print(f"⚠️  {toml_file} not found")
    
    print(f"\n📊 Results: {fixed_count}/{total_count} files fixed successfully")
    
    if fixed_count == total_count:
        print("✅ All TOML files fixed!")
        print("\n🐳 You can now try building the services:")
        print("docker-compose -f docker-compose.dev.yml build")
        return 0
    else:
        print("❌ Some files could not be fixed")
        return 1

if __name__ == "__main__":
    sys.exit(main())