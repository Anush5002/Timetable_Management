import csv
import json
import random

def generate_seeds():
    csv_path = 'teachers_with_designations.csv'
    
    teachers_sql = "INSERT INTO Teachers (teacher_id, name, max_hours_week, availability, vacation_days) VALUES\n"
    users_sql = "INSERT INTO Users (user_id, username, password, role, name, email, phone) VALUES\n"
    
    # Add Admin
    users_sql += "      (1, 'admin01', 'admin123', 'Admin', 'Anush Nair', 'anush.nair@college.edu', '+91-7796494278'),\n"
    
    # Define availability times
    full_day = ["09:00-17:00"]
    
    entries = []
    user_entries = []
    
    seen_emails = set()
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            t_id = int(row['teacher_id'])
            # Shift ID by 10 to avoid conflict with Admin if needed, but CSV starts at 1.
            # Let's map CSV ID 1 -> User ID 2 (since Admin is 1)
            # Actually, `Teachers` table ID can be same as User ID or different?
            # In existing server.js:
            # Users: 1(Admin), 2,3,4,5,10,11 (Teachers), 13.. (Students)
            # Teachers: 1, 2, 3, 4, 5, 6
            # The schema says: Teachers(teacher_id). It doesn't FK to Users(user_id) explicitly in the CREATE statement visible,
            # BUT usually they are linked.
            # Existing: User 2 is Teacher "Rohan Verma". Teacher 1 is "Prof. Rohan Verma".
            # The IDs are NOT linked in the seed! Teacher ID is independent.
            # However, for "People" page, it fetches `api/teachers`.
            # Let's just use the CSV IDs for `Teachers` table.
            
            # Normalize Designation
            designation = row['Designation'].strip()
            if designation == "Prof" or designation == "Asst Prof" or designation == "Associate Prof":
                if not designation.endswith('.'):
                    designation += '.'
            
            # Construct Name with Designation
            name = f"{designation} {row['teacher_name']}"
            
            # Smart Availability Generation
            # Goal: Create availability slots that sum up to <= max_hours_week
            # We want "equal distribution" - let's aim for 70-100% of max_hours utilization logic, 
            # but user said "equal distribution... some working 14/22".
            # Let's target a random usage between 50% and 90% of their max capacity to show variation.
            max_h = float(row['total_weekly_hours'])
            target_hours = random.uniform(0.5 * max_h, 0.9 * max_h)
            
            # Slots pool: 9-10, 10-11, ... 16-17 (8 slots/day)
            # 5 Days: Mon-Fri (maybe Sat?)
            days_pool = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
            if random.random() < 0.5: days_pool.append("Saturday")
            
            avail_dict = {d: [] for d in days_pool}
            current_hours = 0
            
            # Possible hour starts: 9, 10, 11, 12, 13 (1-2 lunch?), 14, 15, 16
            valid_starts = [9, 10, 11, 12, 14, 15, 16]
            
            # Greedy fill until target
            attempts = 0
            while current_hours < target_hours and attempts < 100:
                day = random.choice(days_pool)
                start = random.choice(valid_starts)
                duration = 1 # 1 hour blocks are easiest
                
                # Check if slot exists
                start_str = f"{start:02d}:00"
                end_str = f"{start+duration:02d}:00"
                slot_str = f"{start_str}-{end_str}"
                
                if slot_str not in avail_dict[day]:
                    avail_dict[day].append(slot_str)
                    # Sort slots
                    avail_dict[day].sort()
                    current_hours += 1
                attempts += 1
                
            # Filter empty days
            avail_dict = {k: v for k, v in avail_dict.items() if v}
            
            avail_json = json.dumps(avail_dict)
            
            # Vacations (Random)
            vacations = []
            if random.random() < 0.3:
                vacations.append("2024-12-25")
            if random.random() < 0.3:
                vacations.append("2025-01-01")
            vacations_json = json.dumps(vacations)
            
            # SQL Entry
            entries.append(f"      ({t_id}, '{name}', {row['total_weekly_hours']}, '{avail_json}', '{vacations_json}')")
            
            # User Entry (Optional, but good for login)
            # email must be unique
            email = row['email']
            if email in seen_emails:
                email = f"{row['teacher_id']}_{email}"
            seen_emails.add(email)
            
            # User ID: Start from 100 + t_id to be safe
            u_id = 100 + t_id
            user_entries.append(f"      ({u_id}, 'teacher{t_id}', 'welcome{t_id}', 'Teacher', '{row['teacher_name']}', '{email}', '+91-9000000{t_id:03d}')")

    teachers_sql += ",\n".join(entries)
    teachers_sql += "\n    ON DUPLICATE KEY UPDATE name=VALUES(name), max_hours_week=VALUES(max_hours_week), availability=VALUES(availability), vacation_days=VALUES(vacation_days)"
    
    # We might not need to update Users table if not requested, but it keeps things clean.
    # To avoid breaking existing students, I'll skip Users update for now or just print it separately.
    
    print(teachers_sql)

if __name__ == "__main__":
    generate_seeds()
