from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
from .scheduler_core import TimetableManager

app = FastAPI()

manager = TimetableManager()

class GenerateRequest(BaseModel):
    subjects: List[Dict[str, Any]]
    teachers: List[Dict[str, Any]]
    classes: List[Dict[str, Any]]
    rooms: List[Dict[str, Any]]
    config: Optional[Dict[str, Any]] = None
    params: Optional[Dict[str, Any]] = None

class ChangeRequest(BaseModel):
    timetable_id: str
    change: Dict[str, Any]

@app.get("/")
def read_root():
    return {"status": "Scheduler API Running"}

@app.post("/generate")
def generate_schedule(req: GenerateRequest):
    manager.load_data(req.subjects, req.teachers, req.classes, req.rooms, req.config)
    result = manager.generate_schedule(req.params or {})
    return result

@app.post("/validate-change")
def validate_change(req: ChangeRequest):
    # For now, since we haven't implemented full persistent ID storage across calls 
    # (except in memory of this worker), validation might fail if ID is gone.
    # In a real app, 'timetables' would be in DB or Rediss.
    result = manager.validate_change(req.timetable_id, req.change)
    return result

@app.get("/timetable/{timetable_id}")
def get_timetable(timetable_id: str):
    if timetable_id in manager.timetables:
        return {"timetable": manager.timetables[timetable_id]}
    raise HTTPException(status_code=404, detail="Timetable not found")
