import random
import json
import copy
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

class TimetableManager:
    def __init__(self):
        self.subjects = []
        self.teachers = []
        self.classes = []
        self.rooms = []
        self.config = {}
        # Histroy for undo/redo: {timetable_id: [states]}
        self.history = {} 
        self.timetables = {} # Current state of timetables: {timetable_id: data}

    def load_data(self, subjects: List[Dict], teachers: List[Dict], classes: List[Dict], rooms: List[Dict], config: Dict = None):
        self.subjects = subjects
        self.teachers = teachers
        self.classes = classes
        self.rooms = rooms
        self.config = config or {}
        
        # Parse availability and other pre-processing if needed
        for t in self.teachers:
            if isinstance(t.get('availability'), str):
                try:
                    t['availability'] = json.loads(t['availability'])
                except:
                    pass # Keep as is or handle error

    def detect_conflicts(self, timetable: List[Dict]) -> List[Dict]:
        conflicts = []
        
        teacher_slots = {} # teacher_name -> [(day, time_idx, duration)]
        class_slots = {}   # class_name -> [(day, time_idx, duration)]
        room_slots = {}    # room_no -> [(day, time_idx, duration)]
        teacher_daily_hours = {} # teacher_name -> {day: count}

        DAYS = self.config.get('days', ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
        TIMESLOTS = self.config.get('timeslots', [
            "09:00:00-10:00:00", "10:00:00-11:00:00", "11:00:00-12:00:00",
            "12:00:00-13:00:00", "13:00:00-14:00:00", "14:00:00-15:00:00",
            "15:00:00-16:00:00", "16:00:00-17:00:00", "17:00:00-18:00:00"
        ])

        for entry in timetable:
            # Skip if entry is incomplete
            if not all(k in entry for k in ['day', 'time', 'duration', 'teacher_name', 'class_name', 'room_no']):
                continue
                
            day = entry['day']
            time_start = entry['time']
            duration = int(entry['duration'])
            teacher = entry['teacher_name']
            cls = entry['class_name']
            room = entry['room_no']
            
            try:
                start_idx = TIMESLOTS.index(time_start)
            except ValueError:
                continue # Invalid time
                
            entry_slots = []
            for i in range(duration):
                if start_idx + i < len(TIMESLOTS):
                     entry_slots.append((day, start_idx + i))

            for slot in entry_slots:
                # 1. Teacher Overlap
                if teacher not in teacher_slots: teacher_slots[teacher] = []
                if slot in teacher_slots[teacher]:
                     conflicts.append({
                         "type": "teacher_overlap",
                         "severity": "critical",
                         "teacher": teacher,
                         "conflicting_slot": {"day": slot[0], "time": TIMESLOTS[slot[1]]},
                         "entry": entry
                     })
                else:
                    teacher_slots[teacher].append(slot)
                
                # 2. Class Overlap
                if cls not in class_slots: class_slots[cls] = []
                if slot in class_slots[cls]:
                    conflicts.append({
                         "type": "class_overlap",
                         "severity": "critical",
                         "class_name": cls,
                         "conflicting_slot": {"day": slot[0], "time": TIMESLOTS[slot[1]]},
                         "entry": entry
                     })
                else:
                    class_slots[cls].append(slot)
                    
                # 3. Room Overlap
                if room not in room_slots: room_slots[room] = []
                if slot in room_slots[room]:
                    conflicts.append({
                         "type": "room_overlap",
                         "severity": "critical",
                         "room": room,
                         "conflicting_slot": {"day": slot[0], "time": TIMESLOTS[slot[1]]},
                         "entry": entry
                     })
                else:
                    room_slots[room].append(slot)
            
            # 4. Teacher Daily Hours
            if teacher not in teacher_daily_hours: teacher_daily_hours[teacher] = {}
            teacher_daily_hours[teacher][day] = teacher_daily_hours[teacher].get(day, 0) + duration
            
            # Find teacher object for max hours
            t_obj = next((t for t in self.teachers if t['teacher_name'] == teacher or t.get('name') == teacher), None)
            max_hours = 4 # Default
            if t_obj and 'max_hours_per_day' in t_obj:
                max_hours = int(t_obj['max_hours_per_day'])
            
            if teacher_daily_hours[teacher][day] > max_hours:
                 conflicts.append({
                     "type": "teacher_max_hours",
                     "severity": "major",
                     "teacher": teacher,
                     "day": day,
                     "hours": teacher_daily_hours[teacher][day],
                     "max": max_hours
                 })
                 
             # 5. Teacher Availability (assuming processed availability dict)
            if t_obj and 'availability' in t_obj:
                 avail = t_obj['availability']
                 # Logic depends on availability format. Assuming Dict[Day, List[TimeRange]] or List[Day]
                 # Simpler check: if day not in keys (if dict) or list (if list)
                 if isinstance(avail, list):
                     if day not in avail:
                         conflicts.append({
                             "type": "teacher_unavailable",
                             "severity": "critical",
                             "teacher": teacher,
                             "day": day
                         })
                 elif isinstance(avail, dict):
                     if day not in avail:
                         conflicts.append({
                             "type": "teacher_unavailable",
                             "severity": "critical",
                             "teacher": teacher,
                             "day": day
                         })
                     # Deep check for time ranges could be added here

        return conflicts

    def validate_change(self, timetable_id: str, change: Dict) -> Dict:
        """
        Simulate a change and return validation result.
        Change format: { "action": "update"|"add", "entry": {...}, "original_entry": {...} }
        """
        if timetable_id not in self.timetables:
             return {"allowed": False, "error": "Timetable not found"}
        
        current_timetable = copy.deepcopy(self.timetables[timetable_id])
        
        # Apply change temporarily
        if change['action'] == 'update':
            # Remove original, add new
            # Identification by some ID is better, but for now we might match by content or index if provided
            # Assuming 'entry' has 'id' or we match by fields
            pass 
            # For simplicity in this logic, let's assume client sends the FULL updated timetable for "simulation" 
            # OR we implement a smart patch.
            # Let's assume the client sends the modified entry and we conceptually replace it.
        
        # For the mock/prototype, let's just assume we receive a 'candidate_timetable' to validate
        # Or a list of changes. 
        # Refined approach: validate_change(current_timetable, modified_entry)
        
        # Need to implement identifying the meaningful change to run specific checks? 
        # Actually simplest is: create temp timetable, run detect_conflicts, comparing with old conflicts.
        
        return {} # Placeholder

    def generate_schedule(self, params: Dict) -> Dict:
        """
        Run the Genetic Algorithm to generate a schedule
        """
        mode = params.get('mode', 'semester')
        seed = params.get('seed')
        
        if seed is not None:
             random.seed(seed)
             
        # GA Configuration
        POPULATION_SIZE = params.get('population_size', 50)
        GENERATIONS = params.get('generations', 100)
        MUTATION_RATE = params.get('mutation_rate', 0.1)
        ELITISM_COUNT = params.get('elitism_count', 2)
        
        # Initialize Population
        population = []
        for _ in range(POPULATION_SIZE):
            sch = Schedule(self.subjects, self.classes, self.teachers, self.rooms, self.config)
            sch.initialize()
            sch.calculate_fitness()
            population.append(sch)
            
        best_schedule = None
        
        for generation in range(GENERATIONS):
            population.sort(key=lambda x: x.fitness, reverse=True)
            
            if population[0].fitness >= 1000:
                best_schedule = population[0]
                break
                
            new_population = population[:ELITISM_COUNT]
            
            while len(new_population) < POPULATION_SIZE:
                # Tournament selection or simple random top 50%
                parent1 = random.choice(population[:max(2, len(population)//2)])
                parent2 = random.choice(population[:max(2, len(population)//2)])
                
                child = self._crossover(parent1, parent2)
                
                if random.random() < MUTATION_RATE:
                    child.mutate()
                    
                child.calculate_fitness()
                new_population.append(child)
                
            population = new_population
            
        if not best_schedule:
            best_schedule = population[0]
            
        # Store result
        timetable_id = str(uuid.uuid4())
        self.timetables[timetable_id] = best_schedule.timetable
        self.history[timetable_id] = [copy.deepcopy(best_schedule.timetable)]
        
        return {
            "status": "success", 
            "timetable_id": timetable_id, 
            "fitness": best_schedule.fitness,
            "conflicts": self.detect_conflicts(best_schedule.timetable) # Final check
        }

    def _crossover(self, parent1, parent2):
        child = Schedule(self.subjects, self.classes, self.teachers, self.rooms, self.config)
        split_idx = random.randint(0, len(parent1.timetable))
        child.timetable = parent1.timetable[:split_idx] + parent2.timetable[split_idx:]
        return child

class Schedule:
    def __init__(self, subjects, classes, teachers, rooms, config):
        self.subjects = subjects
        self.classes = classes
        self.teachers = teachers
        self.rooms = rooms
        self.config = config
        self.timetable = []
        self.fitness = 0
        
        self.DAYS = config.get('days', ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
        self.TIMESLOTS = config.get('timeslots', [
            "09:00:00-10:00:00", "10:00:00-11:00:00", "11:00:00-12:00:00",
            "12:00:00-13:00:00", "13:00:00-14:00:00", "14:00:00-15:00:00",
            "15:00:00-16:00:00", "16:00:00-17:00:00", "17:00:00-18:00:00"
        ])
        
        # Pre-process teacher subjects map
        self.teacher_subjects = {}
        for t in teachers:
            subs = str(t.get('subjects_assigned', '')).replace('"', '').split(',')
            self.teacher_subjects[t['teacher_name']] = [s.strip() for s in subs if s.strip()]

    def initialize(self):
        self.timetable = []
        for cls in self.classes:
            dept = cls.get('department', 'General')
            # Filter subjects for this class/dept. 
            # Note: Logic depends on how subjects are linked. 
            # If subjects have 'department' matching class, or we use a mapping.
            # Assuming logic from original script: match by department.
            
            dept_subjects = [s for s in self.subjects if s.get('department') == dept]
            if not dept_subjects:
                # Fallback: try to find subjects that are specified in class 'subjects' list if available?
                # Original script used dept matching.
                pass

            for subj in dept_subjects:
                try:
                    hours = int(subj.get('hours_per_week', 3))
                except:
                    hours = 3
                
                slots_to_schedule = []
                if hours > 3:
                     slots_to_schedule.append(2) 
                     for _ in range(hours - 2): slots_to_schedule.append(1)
                else:
                     for _ in range(hours): slots_to_schedule.append(1)
                     
                for duration in slots_to_schedule:
                    # Pick teacher
                    possible_teachers = [
                        t for t in self.teachers 
                        if subj['subject_name'] in self.teacher_subjects.get(t['teacher_name'], [])
                    ]
                    if not possible_teachers:
                         possible_teachers = [t for t in self.teachers if t.get('department') == dept]
                    if not possible_teachers:
                         possible_teachers = self.teachers
                         
                    teacher = random.choice(possible_teachers) if possible_teachers else (self.teachers[0] if self.teachers else {})
                    if not teacher: continue
                    
                    # Pick Random Slot
                    day = random.choice(self.DAYS)
                    if duration == 2:
                        valid_starts = self.TIMESLOTS[:-1]
                        time_start = random.choice(valid_starts)
                    else:
                        time_start = random.choice(self.TIMESLOTS)
                        
                    gene = {
                        'class_id': cls.get('class_id'),
                        'class_name': cls.get('class_name'),
                        'department': dept,
                        'subject_id': subj.get('subject_id'),
                        'subject_name': subj.get('subject_name'),
                        'teacher_id': teacher.get('teacher_id'),
                        'teacher_name': teacher.get('teacher_name'),
                        'room_no': cls.get('room_no'), # Default room
                        'day': day,
                        'time': time_start,
                        'duration': duration
                    }
                    self.timetable.append(gene)

    def calculate_fitness(self):
        score = 0
        conflicts = 0
        
        teacher_slots = {}
        class_slots = {}
        room_slots = {}
        teacher_daily_hours = {}
        
        for gene in self.timetable:
            day = gene['day']
            time_start = gene['time']
            duration = gene['duration']
            teacher = gene['teacher_name']
            cls = gene['class_name']
            room = gene['room_no']
            
            try:
                start_idx = self.TIMESLOTS.index(time_start)
            except: continue
            
            current_slots = []
            for i in range(duration):
                if start_idx + i < len(self.TIMESLOTS):
                    current_slots.append((day, start_idx + i))
            
            for slot in current_slots:
                # Teacher
                if teacher not in teacher_slots: teacher_slots[teacher] = []
                if slot in teacher_slots[teacher]: conflicts += 1
                else: teacher_slots[teacher].append(slot)
                
                # Class
                if cls not in class_slots: class_slots[cls] = []
                if slot in class_slots[cls]: conflicts += 1
                else: class_slots[cls].append(slot)
                
                # Room
                if room not in room_slots: room_slots[room] = []
                if slot in room_slots[room]: conflicts += 1
                else: room_slots[room].append(slot)
                
            # Teacher Daily load
            if teacher not in teacher_daily_hours: teacher_daily_hours[teacher] = {}
            teacher_daily_hours[teacher][day] = teacher_daily_hours[teacher].get(day, 0) + duration
            # Check max (simplified)
            if teacher_daily_hours[teacher][day] > 4: conflicts += 1
            
            # Teacher Avail (simplified)
            # Need to cross ref with teacher object from list. 
            # Ideally stored in gene or map. For speed, skip or use optimized map.
            
        self.fitness = 1000 - (conflicts * 10)
        return self.fitness

    def mutate(self):
        if not self.timetable: return
        idx = random.randint(0, len(self.timetable) - 1)
        gene = self.timetable[idx]
        gene['day'] = random.choice(self.DAYS)
        if gene['duration'] == 2:
             gene['time'] = random.choice(self.TIMESLOTS[:-1])
        else:
             gene['time'] = random.choice(self.TIMESLOTS)
