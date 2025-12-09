import os

def patch_server():
    server_path = 'backend/server.js'
    seeds_path = 'seeds.sql'
    
    # Read seeds
    # PowerShell > file usually creates UTF-16LE with BOM
    try:
        with open(seeds_path, 'r', encoding='utf-16') as f:
            new_seeds = f.read().strip()
    except:
        # Fallback to utf-8 if my previous attempt with Out-File worked or if it was utf-8
        with open(seeds_path, 'r', encoding='utf-8') as f:
             new_seeds = f.read().strip()
             
    # Prepare the string for JS: 
    # The seeds.sql contains the raw SQL. server.js needs it inside backticks.
    # The seeds.sql I generated (from print) doesn't have backticks?
    # generate_seeds.py printed: "INSERT INTO ..."
    # So I need to wrap it in backticks.
    
    replacement = f"`{new_seeds}`"
    
    # Read server.js
    with open(server_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Locate the block
    start_marker = "`INSERT INTO Teachers (teacher_id, name, max_hours_week, availability, vacation_days) VALUES"
    end_marker = "ON DUPLICATE KEY UPDATE name=VALUES(name), max_hours_week=VALUES(max_hours_week), availability=VALUES(availability), vacation_days=VALUES(vacation_days)`"
    
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    
    if start_idx == -1 or end_idx == -1:
        print("Could not find markers!")
        return
        
    # Adjust end_idx to include the marker
    end_idx += len(end_marker)
    
    # Perform replacement
    new_content = content[:start_idx] + replacement + content[end_idx:]
    
    with open(server_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("Successfully patched server.js")

if __name__ == "__main__":
    patch_server()
