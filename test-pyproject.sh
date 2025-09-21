#!/bin/bash
# Test if pyproject.toml is valid

echo "Testing pyproject.toml configuration..."

# Try to install in dry-run mode to test configuration
echo "Testing package configuration..."
if python -c "
import tomli
with open('pyproject.toml', 'rb') as f:
    config = tomli.load(f)
    print('✅ pyproject.toml syntax is valid')
    
    if 'build-system' in config:
        print('✅ build-system section found')
    else:
        print('❌ build-system section missing')
        
    if 'project' in config:
        print('✅ project section found')
    else:
        print('❌ project section missing')
        
    if 'tool' in config and 'setuptools' in config['tool']:
        print('✅ setuptools configuration found')
    else:
        print('❌ setuptools configuration missing')
" 2>/dev/null; then
    echo "Configuration looks good!"
else
    echo "Installing tomli for config validation..."
    pip install tomli
    python -c "
import tomli
with open('pyproject.toml', 'rb') as f:
    config = tomli.load(f)
    print('✅ pyproject.toml syntax is valid')
"
fi

echo ""
echo "Attempting dry-run installation..."
if pip install --dry-run -e . 2>/dev/null; then
    echo "✅ Package configuration is valid"
else
    echo "❌ Package configuration has issues"
    echo "This might be expected if dependencies are not available"
fi