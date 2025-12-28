import os
from pathlib import Path

def generate_arcade_project_files():
    """Generate output file with all arcade project files"""
    
    output_file = "arcade_project_complete.txt"
    file_count = 0
    
    with open(output_file, 'w', encoding='utf-8') as outfile:
        
        # Process all files in the project
        for root, dirs, files in os.walk('.'):
            # Skip node_modules directory
            if 'node_modules' in root:
                continue
                
            # Remove node_modules from directories to traverse
            dirs[:] = [d for d in dirs if d != 'node_modules']
            
            for file in files:
                # Skip package-lock.json
                if file == 'package-lock.json':
                    continue
                    
                file_path = Path(root) / file
                
                # Skip if file doesn't exist
                if not file_path.exists():
                    continue
                
                # Get relative path
                rel_path = file_path.relative_to('.')
                
                # Skip binary/image files (but include SVG since it's text)
                if file_path.suffix in ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.pem']:
                    print(f"Skipping binary file: {rel_path}")
                    continue
                
                try:
                    # Read file content
                    with open(file_path, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                    
                    # Write file header and content
                    outfile.write(f"My {rel_path}:\n\n")
                    outfile.write('"' + '\n')
                    outfile.write(content)
                    outfile.write('\n"\n\n')
                    file_count += 1
                    
                    print(f"✓ Added: {rel_path}")
                    
                except UnicodeDecodeError:
                    # Try with different encoding
                    try:
                        with open(file_path, 'r', encoding='latin-1') as infile:
                            content = infile.read()
                        
                        outfile.write(f"My {rel_path}:\n\n")
                        outfile.write('"' + '\n')
                        outfile.write(content)
                        outfile.write('\n"\n\n')
                        file_count += 1
                        print(f"✓ Added (latin-1): {rel_path}")
                    except:
                        # Skip binary files
                        print(f"Skipping unreadable file: {rel_path}")
                except Exception as e:
                    print(f"Error reading {rel_path}: {e}")
    
    print(f"\n✅ Output generated: {output_file}")
    print(f"✅ Total files processed: {file_count}")
    print(f"\n📁 Project structure processed:")
    print("  • All root files")
    print("  • src/ directory and all subdirectories")
    print("  • public/ directory")
    print("  • All configuration files")
    print("\n⛔ Files excluded:")
    print("  • node_modules/ directory")
    print("  • package-lock.json")
    print("  • Binary image files (.png, .jpg, .jpeg, .gif, .ico)")
    print("  • SSL certificate files (.pem)")

if __name__ == "__main__":
    print("Generating arcade-profit-games project files...\n")
    generate_arcade_project_files()