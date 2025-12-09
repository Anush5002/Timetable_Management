import csv
import json
import random
import sys
import os
import copy
from datetime import datetime

# --- Configuration ---
# --- Configuration ---
# Significantly increased for better convergence
POPULATION_SIZE = 50 
GENERATIONS = 1000
MUTATION_RATE = 0.2
ELITISM_COUNT = 5
TOURNAMENT_SIZE = 5

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
TIMESLOTS = [
    "09:00:00-10:00:00", "10:00:00-11:00:00", "11:00:00-12:00:00",
    "12:00:00-13:00:00", "13:00:00-14:00:00", "14:00:00-15:00:00",
    "15:00:00-16:00:00", "16:00:00-17:00:00", "17:00:00-18:00:00"
]



# --- Data Loading ---

# --- Data Loading ---

def load_csv(filename):
    data = []
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append(row)
    except FileNotFoundError:
        return []
    return data

def normalize_teacher_name(name):
    """Strips titles like Prof., Dr., etc. for matching."""
    titles = ['Prof.', 'Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Asst. Prof.', 'Associate Prof.', 'HOD']
    clean = name
    # Sort titles by length desc to handle "Asst. Prof." before "Prof."
    titles.sort(key=len, reverse=True)
    for t in titles:
        if clean.startswith(t):
            clean = clean[len(t):].strip()
    return clean.strip()

def get_data():
    base_path = os.getcwd()
    if os.path.basename(base_path) != 'backend':
        if os.path.exists(os.path.join(base_path, 'backend', 'scheduler.py')):
            base_path = os.path.join(base_path, 'backend')
    
    # Try loading from JSON dump (Live DB Data)
    json_path = os.path.join(base_path, 'scheduler_input.json')
    if os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                # Hydrate Teachers with CSV expertise if needed
                csv_teachers = load_csv(os.path.join(base_path, 'teachers_with_designations.csv'))
                expert_map = {t['teacher_name']: t.get('subjects_assigned', '') for t in csv_teachers}
                
                teachers = data['teachers']
                teachers = data['teachers']
                for t in teachers:
                    # Fix Name Mismatch: Normalize "Prof. Rohan" -> "Rohan"
                    clean_name = normalize_teacher_name(t['name'])
                    # Try exact match first, then normalized
                    if t['name'] in expert_map:
                        t['subjects_assigned'] = expert_map.get(t['name'], '')
                    else:
                        t['subjects_assigned'] = expert_map.get(clean_name, '')
                    
                subjects = data['subjects']
                classes = data['classes']
                return subjects, classes, teachers, data.get('rooms', []), data.get('constraints', []), data.get('courses', [])
        except Exception as e:
            print(f"DEBUG: Error loading JSON: {e}", file=sys.stderr)
            
    # Fallback to CSV
    subjects = load_csv(os.path.join(base_path, 'subjects_dataset.csv'))
    classes = load_csv(os.path.join(base_path, 'classes_divisions_dataset.csv'))
    teachers = load_csv(os.path.join(base_path, 'teachers_with_designations.csv'))
    return subjects, classes, teachers, [], [], []

class Schedule:
    def __init__(self, subjects, classes, teachers, rooms, constraints, courses):
        self.subjects = subjects
        self.classes = classes
        self.teachers = teachers
        self.rooms = rooms
        self.constraints = constraints
        self.courses = courses
        self.timetable = [] 
        self.fitness = 0
        
        # Pre-process teacher subjects map
        self.teacher_subjects = {}
        for t in teachers:
            raw = t.get('subjects_assigned', '')
            subs = raw.replace('"', '').split(',')
            self.teacher_subjects[t['name']] = [s.strip() for s in subs if s.strip()]

        # Parse Teacher Availability Strict Slots
        # Map: teacher_name -> set of (day, t_idx) tuples
        self.teacher_availability_slots = {}
        for t in teachers:
            valid_slots = set()
            avail_raw = t.get('availability')
            
            # Case 1: JSON Object (from DB input)
            if isinstance(avail_raw, dict):
                for day, slots in avail_raw.items():
                    if day not in DAYS: continue
                    for slot_str in slots:
                        # slot_str like "09:00-10:00"
                        # Match to TIMESLOTS (ignoring seconds)
                        for idx, ts in enumerate(TIMESLOTS):
                            if slot_str in ts or ts.startswith(slot_str): 
                                valid_slots.add((day, idx))
            
            # Case 2: JSON String (from some DB drivers or CSV if formatted as json)
            elif isinstance(avail_raw, str) and avail_raw.strip().startswith('{'):
                try:
                    avail_dict = json.loads(avail_raw)
                    for day, slots in avail_dict.items():
                        if day not in DAYS: continue
                        for slot_str in slots:
                            for idx, ts in enumerate(TIMESLOTS):
                                if slot_str in ts or ts.startswith(slot_str):
                                    valid_slots.add((day, idx))
                except: pass

            # Case 3: Simple Day List (CSV fallback) - e.g. "Mon, Tue"
            # If no specific hours provided, assume ALL hours on those days are valid (backward compat)
            elif isinstance(avail_raw, str):
                for day in DAYS:
                    if day in avail_raw:
                        for idx in range(len(TIMESLOTS)):
                            valid_slots.add((day, idx))
            
            # If no availability data found, default to ALL slots (or NONE? User said "strict". But for safety, all.)
            # But user requested Strict. If data exists, use it. If empty/null? 
            # Let's assume if the set is empty, they are available (default behavior) OR unavailable?
            # User said: "if rohan verma have 2rs availability on monday then 2 hrs lecture... same for all".
            # This implies if they have data, enforce it. If they have NO data (empty), maybe default to full?
            if not valid_slots and not avail_raw:
                # Default to full availability if nothing specified to prevent broken schedules for unconfigured teachers
                for day in DAYS:
                    for idx in range(len(TIMESLOTS)):
                        valid_slots.add((day, idx))
            
            self.teacher_availability_slots[t['name']] = valid_slots
            
        # Optimization: Create map of class -> required subjects
        self.class_requirements = {}
        
        # Map subject_id to object for quick lookup
        subj_map = {str(s['subject_id']): s for s in self.subjects}
        
        # Course Map: (department, year) -> course object
        self.course_lookup = {}
        for c in self.courses:
            key = (c.get('department'), c.get('year'))
            self.course_lookup[key] = c
        
        for cls in self.classes:
             reqs = []
             
             # Identify Course Mapping
             dept = cls.get('department')
             year = cls.get('year')
             
             matched_course = self.course_lookup.get((dept, year))
             
             if not matched_course:
                 # Try first course with matching department as last resort
                 for c in self.courses:
                     if c.get('department') == dept:
                         matched_course = c
                         break

             # Override: User wants simple Course Name (e.g. CS, IT) which maps to Department
             cls['course_name'] = dept
             
             # If cls has 'subjects' list (from DB), use it
             # Ensure cls['subjects'] is parsed if it's a string (though get_data usually handles JSON)
             cls_subjects_ids = cls.get('subjects', [])
             if isinstance(cls_subjects_ids, str):
                 try: cls_subjects_ids = json.loads(cls_subjects_ids)
                 except: cls_subjects_ids = []
                 
             target_subjects = []
             
             if cls_subjects_ids:
                 for sid in cls_subjects_ids:
                     s_obj = subj_map.get(str(sid))
                     if s_obj: target_subjects.append(s_obj)
             else:
                 # Fallback to course subjects
                 if matched_course:
                      target_subjects = [s for s in self.subjects if s.get('course_id') == matched_course['course_id']]
                 else:
                      target_subjects = [s for s in self.subjects if s.get('department') == dept]

             for subj in target_subjects:
                 try:
                     hours = int(subj['hours_per_week'])
                 except: hours = 4
                 
                 # Assign teacher
                 # 1. Find Qualified Teachers
                 qualified = [t for t in self.teachers if subj['subject_name'] in self.teacher_subjects.get(t['name'], [])]
                 if not qualified: qualified = self.teachers # Fallback
                 
                 # 2. Filter by Capacity (Smart Load Balancing)
                 # We need to track load. But self.class_requirements is built once.
                 # We can add a temporary load tracker to self.
                 if not hasattr(self, '_temp_teacher_load'): self._temp_teacher_load = {}
                 
                 candidates_with_space = []
                 for t in qualified:
                     t_name = t['name']
                     current = self._temp_teacher_load.get(t_name, 0)
                     # Get Max Capacity from Strict Availability Slots
                     avail_slots = len(self.teacher_availability_slots.get(t_name, []))
                     # If no availability data, assume infinite (or default max)
                     if not avail_slots: avail_slots = 999
                     
                     if current + hours <= avail_slots:
                         candidates_with_space.append(t)
                 
                 # 3. Pick Teacher
                 if candidates_with_space:
                     # Pick one randomly or usage-based? Random is fine for distribution
                     assigned_teacher = random.choice(candidates_with_space)
                 else:
                     # All qualified are full! We MUST overbook someone or pick random.
                     # Pick the one with ANY availability defined first?
                     # Just pick random qualified to share the pain.
                     assigned_teacher = random.choice(qualified)
                 
                 # Update Load
                 self._temp_teacher_load[assigned_teacher['name']] = self._temp_teacher_load.get(assigned_teacher['name'], 0) + hours
                 
                 # Breakdown into slots
                 if hours > 3:
                     reqs.append({'duration': 2, 'subject': subj, 'teacher': assigned_teacher, 'type': 'Lab' if subj.get('type')=='Lab' else 'Theory'})
                     for _ in range(hours - 2):
                         reqs.append({'duration': 1, 'subject': subj, 'teacher': assigned_teacher, 'type': 'Theory'})
                 else:
                     for _ in range(hours):
                         reqs.append({'duration': 1, 'subject': subj, 'teacher': assigned_teacher, 'type': 'Theory'})
             
             self.class_requirements[cls['class_id']] = reqs

    def initialize(self):
        self.timetable = []
        
        sorted_class_ids = list(self.class_requirements.keys())
        random.shuffle(sorted_class_ids) 
        
        self.init_teacher_slots = {}
        self.init_class_slots = {}
        self.init_room_slots = {}

        for class_id in sorted_class_ids:
            cls = next(c for c in self.classes if c['class_id'] == class_id)
            reqs = self.class_requirements.get(class_id, [])
            
            # Sort requirements: 2-hour blocks first
            reqs.sort(key=lambda x: x['duration'], reverse=True)

            for req in reqs:
                found_slot = False
                
                # Determine Valid Rooms from DB or Hardcoded
                if req['type'] == 'Lab':
                    candidate_rooms = [r['room_name'] for r in self.rooms if r['type'] == 'Lab']
                else:
                    candidate_rooms = [r['room_name'] for r in self.rooms if r['type'] == 'Lecture']
                if not candidate_rooms: candidate_rooms = [r['room_name'] for r in self.rooms]
                    
                # Prefer the class's default room if it matches type, else just shuffle all
                default_room = cls.get('room_no')
                # Simplistic check: if default room is in candidates, try it first
                room_pool = list(candidate_rooms)
                if default_room in room_pool:
                    room_pool.remove(default_room)
                    room_pool.insert(0, default_room)
                else:
                    random.shuffle(room_pool)
                
                # Create a random order of days/times
                # STRICT: Only pick slots that are valid for the teacher
                possible_slots = []
                teacher_valid_slots = self.teacher_availability_slots.get(req['teacher']['name'], set())
                
                # If teacher has no valid slots at all in our map (fallback), revert to all
                if not teacher_valid_slots:
                    # Fallback (should be covered by init logic, but safety first)
                     for d_idx, day in enumerate(DAYS):
                        for t_idx in range(len(TIMESLOTS)):
                             teacher_valid_slots.add((day, t_idx))

                for day, t_idx in teacher_valid_slots:
                    # Duration check: if 2 hours, need next slot to be valid too?
                    # Ideally yes. But simpler: just check start slot availability for now, 
                    # check next slot in loop.
                    
                    if req['duration'] == 2:
                        # For 2 hour block, we need t_idx and t_idx+1
                        if t_idx + 1 >= len(TIMESLOTS): continue # Out of bounds
                        
                        # Strict check: Is the next hour ALSO available?
                        if (day, t_idx + 1) not in teacher_valid_slots: continue
                        
                        possible_slots.append((day, TIMESLOTS[t_idx], t_idx))
                    else:
                        possible_slots.append((day, TIMESLOTS[t_idx], t_idx))
                
                random.shuffle(possible_slots)
                
                teacher_name = req['teacher']['name']
                class_name = cls['class_name']
                
                # Greedy Search: Loop rooms then slots (or slots then rooms? Slots then rooms is better for tightness)
                # Actually, iterating slots then rooms maximizes finding ANY spot.
                
                for day, time_str, t_idx in possible_slots:
                    if found_slot: break
                    
                    indices = [t_idx]
                    if req['duration'] == 2: indices.append(t_idx + 1)
                    
                    # 1. Check Teacher Availability First (Constant for all rooms)
                    teacher_busy = False
                    for idx_check in indices:
                        if (day, idx_check) in self.init_teacher_slots.get(teacher_name, set()):
                            teacher_busy = True; break
                    if teacher_busy: continue
                    
                    # 2. Check Class Availability First (Constant for all rooms)
                    class_busy = False
                    for idx_check in indices:
                         if (day, idx_check) in self.init_class_slots.get(class_name, set()):
                             class_busy = True; break
                    if class_busy: continue
                    
                    # 3. Find Free Room
                    for r_chk in room_pool:
                        room_busy = False
                        for idx_check in indices:
                            if (day, idx_check) in self.init_room_slots.get(r_chk, set()):
                                room_busy = True; break
                        
                        if not room_busy:
                            # FOUND!
                            gene = self._make_gene(cls, req, day, time_str, r_chk)
                            self.timetable.append(gene)
                            
                            # Mark occupied
                            for idx_check in indices:
                                slot_tuple = (day, idx_check)
                                self.init_teacher_slots.setdefault(teacher_name, set()).add(slot_tuple)
                                self.init_class_slots.setdefault(class_name, set()).add(slot_tuple)
                                self.init_room_slots.setdefault(r_chk, set()).add(slot_tuple)
                                
                            found_slot = True
                            break
                            
                if not found_slot:
                    # Fallback
                    # FallbackStrategy: Just pick ANY valid teacher slot, even if conflicted
                    if possible_slots:
                        day, time_str, t_idx = random.choice(possible_slots)
                        # We must respect duration for the gene
                        if req['duration'] == 2:
                            # ensure we didn't pick last slot (filtered above)
                            pass
                    else:
                        # Teacher has NO available slots? Force random (will have huge penalty)
                        day = random.choice(DAYS)
                        if req['duration'] == 2: time_str, t_idx = random.choice([(TIMESLOTS[i], i) for i in range(len(TIMESLOTS)-1)])
                        else: time_str, t_idx = random.choice([(TIMESLOTS[i], i) for i in range(len(TIMESLOTS))])

                    # Pick random room of correct type
                    # Pick random room of correct type
                    r_fallback = random.choice(candidate_rooms)
                    r_fallback = random.choice(candidate_rooms)
                    gene = self._make_gene(cls, req, day, time_str, r_fallback)
                    self.timetable.append(gene)
                    gene['_conflict'] = True

    def _make_gene(self, cls, req, day, time, room):
        return {
            'course_id': cls.get('course_id'),
            'course_name': cls.get('course_name'),
            'class_id': cls['class_id'],
            'class_name': cls['class_name'],
            'department': cls['department'],
            'year': cls['year'],
            'subject_id': req['subject']['subject_id'],
            'subject_name': req['subject']['subject_name'],
            'teacher_id': req['teacher']['teacher_id'],
            'teacher_name': req['teacher']['name'],
            'room_no': room,
            'day': day,
            'time': time,
            'duration': req['duration'],
            'type': req.get('type', 'Theory')
        }
        
    def calculate_fitness(self):
        # ... (Same as before, but checking rooms)
        # Note: Previous fitness function is generic enough to handle changed room_no since gene['room_no'] is updated
        conflicts = 0
        teacher_slots = {}
        class_slots = {}
        room_slots = {}
        
        ts_map = {ts: i for i, ts in enumerate(TIMESLOTS)}
        
        ts_map = {ts: i for i, ts in enumerate(TIMESLOTS)}
        
        for gene in self.timetable:
            if gene.get('_is_fixed_break'): continue # Skip fitness for immutable breaks if any
            
            day = gene['day']
            time = gene['time']
            duration = gene['duration']
            
            start_idx = ts_map.get(time)
            if start_idx is None: 
                conflicts += 1; continue
            
            current_conflict = False
            for i in range(duration):
                idx = start_idx + i
                if idx >= len(TIMESLOTS):
                    conflicts += 1; current_conflict = True; break
                    
                slot = f"{day}_{idx}"
                t_name = gene['teacher_name']
                c_name = gene['class_name']
                r_name = gene['room_no']
                
                r_name = gene['room_no']
                
                # CHECK: Strict Availability
                if (day, idx) not in self.teacher_availability_slots.get(t_name, set()):
                    conflicts += 5 # Heavy penalty for working outside availability
                    current_conflict = True
                
                if slot in teacher_slots.get(t_name, set()):
                    conflicts += 1; current_conflict = True
                else: teacher_slots.setdefault(t_name, set()).add(slot)
                
                if slot in class_slots.get(c_name, set()):
                    conflicts += 1; current_conflict = True
                else: class_slots.setdefault(c_name, set()).add(slot)
                
                if slot in room_slots.get(r_name, set()):
                    conflicts += 1; current_conflict = True
                else: room_slots.setdefault(r_name, set()).add(slot)
            
            if current_conflict: gene['_conflict'] = True
            else: gene.pop('_conflict', None)
                     
        self.fitness = 10000 - (conflicts * 10)
        return self.fitness

    def guided_mutate(self):
        if not self.timetable: return
        conflicting_indices = [i for i, g in enumerate(self.timetable) if g.get('_conflict')]
        if not conflicting_indices: idx = random.randint(0, len(self.timetable) - 1)
        else: idx = random.choice(conflicting_indices)
            
        gene = self.timetable[idx]
        
        # Mutation: Change Time OR Room
        # 50% chance to change room if conflict is likely room-based (heuristic: simple random switch)
        if random.random() < 0.5:
             # Change Room
             if self.rooms:
                 if gene.get('type') == 'Lab': candidates = [r['room_name'] for r in self.rooms if r['type'] == 'Lab']
                 else: candidates = [r['room_name'] for r in self.rooms if r['type'] == 'Lecture']
                 
                 # Fallback
                 if not candidates: candidates = [r['room_name'] for r in self.rooms]
                 
                 if candidates: gene['room_no'] = random.choice(candidates)
        else:
             # Change Time
             t_name = gene['teacher_name']
             valid_slots = self.teacher_availability_slots.get(t_name, [])
             if not valid_slots:
                 # Fallback
                 gene['day'] = random.choice(DAYS)
                 if gene['duration'] == 2: gene['time'] = random.choice(TIMESLOTS[:-1])
                 else: gene['time'] = random.choice(TIMESLOTS)
             else:
                 # Pick a valid slot from availability
                 # Filter first for duration
                 candidates = []
                 for d, idx in valid_slots:
                     if gene['duration'] == 2:
                         if idx + 1 >= len(TIMESLOTS): continue
                         if (d, idx+1) not in valid_slots: continue # Next hour must be valid too
                         candidates.append((d, TIMESLOTS[idx]))
                     else:
                         candidates.append((d, TIMESLOTS[idx]))
                 
                 if candidates:
                     d, t = random.choice(candidates)
                     gene['day'] = d
                     gene['time'] = t
        
        gene.pop('_conflict', None)

    def crossover(self, other):
        child = Schedule(self.subjects, self.classes, self.teachers, self.rooms, self.constraints, self.courses)
        # Block-based crossover (better for preserving class timetables)
        # Split by classes, not just random index
        
        # However, for list structure, simple split is faster:
        split = random.randint(0, len(self.timetable))
        
        # Deepcopy is SLOW. Avoid if possible.
        # But we must copy dicts.
        # Optimization: Manual list slice copy
        child.timetable = [g.copy() for g in self.timetable[:split]] + [g.copy() for g in other.timetable[split:]]
        return child

    def repair_schedule(self):
        """
        Aggressively fixes conflicts by trying all possible valid slots.
        Returns a list of resolution actions.
        """
        resolutions = []
        # Re-run fitness to ensure _conflict flags are up to date
        self.calculate_fitness()
        
        # Identify conflicts
        conflict_genes = [g for g in self.timetable if g.get('_conflict')]
        if not conflict_genes: return []
        
        print(f"DEBUG: Attempting to repair {len(conflict_genes)} conflicts...", file=sys.stderr)
        
        # Build Occupancy Maps
        teacher_slots = set()
        class_slots = set()
        room_slots = set()
        
        ts_map = {ts: i for i, ts in enumerate(TIMESLOTS)}
        
        # Populate maps with NON-conflicting genes first
        for g in self.timetable:
            if g.get('_conflict'): continue
            
            day = g['day']
            time = g['time']
            duration = g['duration']
            start_idx = ts_map.get(time)
            
            for i in range(duration):
                idx = start_idx + i
                slot = f"{day}_{idx}"
                teacher_slots.add(f"{g['teacher_name']}_{slot}")
                class_slots.add(f"{g['class_name']}_{slot}")
                room_slots.add(f"{g['room_no']}_{slot}")

        # Repeat repair passes to propagate simple fixes
        for invalid_pass in range(3):
            # Identify conflicts dynamicallly
            conflict_genes = [g for g in self.timetable if g.get('_conflict')]
            if not conflict_genes: break
            
            # Try to fix each conflict
            for gene in conflict_genes:
                resolved = False
                teacher = gene['teacher_name']
                cls_name = gene['class_name']
                duration = gene['duration']
                
                if gene.get('type') == 'Lab': 
                    if self.rooms: candidates = [r['room_name'] for r in self.rooms if r['type'] == 'Lab']
                    else: candidates = LAB_ROOMS
                else: 
                    if self.rooms: candidates = [r['room_name'] for r in self.rooms if r['type'] == 'Lecture']
                    else: candidates = LECTURE_ROOMS
                    
                if not candidates: candidates = LECTURE_ROOMS if not self.rooms else [r['room_name'] for r in self.rooms]
                
                # Setup shuffle
                days_shuffled = list(DAYS); random.shuffle(days_shuffled)
                rooms_shuffled = list(candidates); random.shuffle(rooms_shuffled)
                
                # Strategy 1: Find Empty Slot
                for room in rooms_shuffled:
                    if resolved: break
                    for day in days_shuffled:
                        if resolved: break
                        
                        # Filter times by Teacher Availability
                        valid_slots = self.teacher_availability_slots.get(teacher, set())
                        
                        # Only consider times that are VALID for this teacher
                        possible_time_indices = []
                        for val_d, val_idx in valid_slots:
                            if val_d == day:
                                if duration == 1: possible_time_indices.append(val_idx)
                                elif duration == 2 and val_idx < len(TIMESLOTS)-1 and (val_d, val_idx+1) in valid_slots:
                                    possible_time_indices.append(val_idx)
                        
                        times_shuffled = list(possible_time_indices); random.shuffle(times_shuffled)
                        
                        for t_idx in times_shuffled:
                            # Check availability
                            t_indices = [t_idx]
                            if duration == 2: t_indices.append(t_idx+1)
                            
                            is_valid = True
                            for idx in t_indices:
                                slot = f"{day}_{idx}"
                                if f"{teacher}_{slot}" in teacher_slots: is_valid = False; break
                                if f"{cls_name}_{slot}" in class_slots: is_valid = False; break
                                if f"{room}_{slot}" in room_slots: is_valid = False; break
                            
                            if is_valid:
                                # FOUND A SLOT! Move gene here
                                old_day, old_time = gene['day'], gene['time']
                                gene['day'] = day
                                gene['time'] = TIMESLOTS[t_idx]
                                gene['room_no'] = room
                                gene.pop('_conflict', None)
                                
                                # Update maps
                                for idx in t_indices:
                                    slot = f"{day}_{idx}"
                                    teacher_slots.add(f"{teacher}_{slot}")
                                    class_slots.add(f"{cls_name}_{slot}")
                                    room_slots.add(f"{room}_{slot}")
                                    
                                resolutions.append(f"Moved {gene['subject_name']} ({cls_name}) to {day} {gene['time']} in {room}")
                                resolved = True
                                break
                
                # Strategy 2: Swap with Non-Conflicting Gene (1-Ply Lookahead)
                if not resolved:
                     # Attempt to find a "target" gene that occupies a valid slot for US, 
                     # but CAN move somewhere else.
                     for other_gene in self.timetable:
                         if other_gene is gene: continue
                         if other_gene.get('_conflict'): continue # Don't swap with another conflict
                         
                         # Check if other_gene's slot is valid for US (except for the fact other_gene is there)
                         # We need to match Teacher/Class availability at that slot.
                         # Wait, if other_gene is there, the Room is taken. But Teacher/Class might be free.
                         
                         # Target Slot properties
                         t_day, t_time, t_room = other_gene['day'], other_gene['time'], other_gene['room_no']
                         t_duration = other_gene['duration']
                         
                         if t_duration != duration: continue # Only simple swaps for now
                         if t_room not in candidates: continue # Specific room type needed
                         
                         # Is Teacher/Class free at target slot? (excluding current conflict presence?)
                         # Actually, we rely on our maps, which don't include the current conflict gene (it's floating).
                         # But wait, the maps DO include the current conflict gene's OLD position? 
                         # No, usually we treat it as "moving".
                         
                         # Check if target slot is usable by 'gene'
                         # We need to check if 'gene's teacher and 'gene's class are free at (t_day, t_time)
                         # BUT excluding the occupancy of 'other_gene' (which holds the room, but maybe not same teacher)
                         
                         t_start_idx = ts_map[t_time]
                         t_indices = [t_start_idx]
                         if duration == 2: t_indices.append(t_start_idx+1)
                         
                         can_swap_here = True
                         for idx in t_indices:
                             slot = f"{t_day}_{idx}"
                             # Check Teacher
                             if f"{teacher}_{slot}" in teacher_slots and gene['teacher_name'] != other_gene['teacher_name']:
                                 can_swap_here = False; break
                             # Check Class
                             if f"{cls_name}_{slot}" in class_slots and gene['class_name'] != other_gene['class_name']:
                                 can_swap_here = False; break
                         
                         if not can_swap_here: continue
                         
                         # OK, 'gene' fits into 'other_gene's slot IF 'other_gene' moves.
                         # Can 'other_gene' move to an empty slot?
                         
                         # Find empty slot for 'other_gene'
                         can_move_other = False
                         move_target = None
                         
                         # Quick search for other_gene
                         # (Reuse logic or simplified)
                         o_candidates = candidates
                         random.shuffle(days_shuffled)
                         
                         for o_day in days_shuffled:
                             if can_move_other: break
                             
                             # Strict Availability for Swapped Class
                             o_teacher = other_gene['teacher_name']
                             o_valid_slots = self.teacher_availability_slots.get(o_teacher, set())
                             o_day_indices = [idx for (d, idx) in o_valid_slots if d == o_day]
                             random.shuffle(o_day_indices)
                             
                             for o_t_idx in o_day_indices:
                                 if can_move_other: break
                                 
                                 # Skip if it's the same slot
                                 if o_day == t_day and o_t_idx == t_start_idx: continue
                                 
                                 o_indices = [o_t_idx] if t_duration == 1 else [o_t_idx, o_t_idx+1]
                                 if t_duration == 2 and o_t_idx >= len(TIMESLOTS)-1: continue
                                 
                                 o_valid = True
                                 o_room_target = None
                                 
                                 # Try to find a room for other_gene
                                 for o_room in o_candidates:
                                     o_room_free = True
                                     for o_idx in o_indices:
                                         s_str = f"{o_day}_{o_idx}"
                                         if f"{other_gene['teacher_name']}_{s_str}" in teacher_slots: o_room_free = False; break
                                         if f"{other_gene['class_name']}_{s_str}" in class_slots: o_room_free = False; break
                                         if f"{o_room}_{s_str}" in room_slots: o_room_free = False; break
                                     
                                     if o_room_free:
                                         o_room_target = o_room
                                         break
                                 
                                 if o_room_target:
                                     move_target = (o_day, TIMESLOTS[o_t_idx], o_room_target)
                                     can_move_other = True
                         
                         if can_move_other:
                             # PERFORM SWAP
                             # 1. Move other_gene to move_target
                             # 2. Move gene to other_gene's old slot
                             
                             od, ot, orm = move_target
                             
                             # Update maps (Remove old other, Add new other, Add new gene)
                             # Since maps are additive, we just add new positions.
                             # Correctness depends on not checking old positions for validation, which holds if we move fast.
                             
                             # Move Other
                             other_gene['day'] = od
                             other_gene['time'] = ot
                             other_gene['room_no'] = orm
                             
                             # Move Gene
                             gene['day'] = t_day
                             gene['time'] = t_time
                             gene['room_no'] = t_room
                             gene.pop('_conflict', None)
                             
                             resolutions.append(f"Swapped {gene['subject_name']} with {other_gene['subject_name']}")
                             resolved = True
                             break
                             
                # Strategy 3: Create Overflow Room (If Teacher/Class logic allows)
                # If we are here, it means we couldn't find a slot or swap due to Room Constraints OR Teacher/Class constraints.
                # Let's try to find a slot where ONLY Room constraint is broken.
                if not resolved:
                     # Strategy 3: Create Overflow Room - DISABLED
                     # User requires only existing rooms to be used.
                     pass
                     # best_overflow_slot = None
                     # ... (Overflow logic removed)
        
        return resolutions

def run_genetic_algorithm():
    import time
    start_time = time.time()
    MAX_TIME_SECONDS = 25 # Return result within 25s
    
    subjects, classes, teachers, rooms, constraints, courses = get_data()
    
    # Initialize Population
    population = []
    # Since we use greedy init, we can reduce population size for speed!
    # Greedy init gives near-optimal solutions almost immediately.
    POPULATION_SIZE = 30 # Reduced from 100
    
    for _ in range(POPULATION_SIZE):
        sch = Schedule(subjects, classes, teachers, rooms, constraints, courses)
        sch.initialize() # Greedy Init
        sch.calculate_fitness()
        population.append(sch)
        
    best_ever = population[0]
    
    gen = 0
    while gen < GENERATIONS:
        # Check time
        if time.time() - start_time > MAX_TIME_SECONDS:
            break
            
        population.sort(key=lambda x: x.fitness, reverse=True)
        current_best = population[0]
        
        if current_best.fitness > best_ever.fitness:
            best_ever = current_best
            
        if current_best.fitness >= 10000: # Perfect
            best_ever = current_best
            break
            
        new_tuple_pop = population[:ELITISM_COUNT]
        
        while len(new_tuple_pop) < POPULATION_SIZE:
             # Smaller Tournament for speed
             t_size = 3
             parent1 = max(random.sample(population, t_size), key=lambda x: x.fitness)
             parent2 = max(random.sample(population, t_size), key=lambda x: x.fitness)
             
             child = parent1.crossover(parent2)
             
             if random.random() < MUTATION_RATE:
                 child.guided_mutate()
                 
             child.calculate_fitness()
             new_tuple_pop.append(child)
             
        population = new_tuple_pop
        gen += 1

        gen += 1

    # Post-GA Repair Phase
    resolutions = best_ever.repair_schedule()
    # Final check
    best_ever.calculate_fitness()
    
    # Format for JSON
    output_schedule = best_ever.timetable
    formatted_output = []
    for item in output_schedule:
        start_time_str = item['time'].split('-')[0]
        start_idx = TIMESLOTS.index(item['time'])
        end_idx = start_idx + item['duration'] - 1
        if end_idx >= len(TIMESLOTS): end_idx = len(TIMESLOTS) - 1
        end_time_str = TIMESLOTS[end_idx].split('-')[1]
        
        formatted_output.append({
            "course_id": item['course_id'],
            "course_name": item['course_name'],
            "course_year": item['year'],
            "subject_id": item['subject_id'],
            "subject_name": item['subject_name'],
            "teacher_id": item['teacher_id'],
            "teacher_name": item['teacher_name'],
            "room_id": item['room_no'],
            "room_name": item['room_no'],
            "class_name": item['class_name'],
            "day_of_week": item['day'],
            "start_time": start_time_str,
            "end_time": end_time_str,
            "student_group": [item['class_name']]
        })

    print(json.dumps(formatted_output))

if __name__ == "__main__":
    run_genetic_algorithm()
