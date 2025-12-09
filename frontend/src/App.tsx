import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import LoginPage from "@/pages/auth/LoginPage";
import Dashboard from "@/pages/dashboard/Dashboard";
import Courses from "@/pages/courses/Courses";
import NewCourse from "@/pages/courses/NewCourse";
import EditCourse from "@/pages/courses/EditCourse";
import EditSubject from "@/pages/courses/EditSubject";
import People from "@/pages/people/People";
import NewPerson from "@/pages/people/NewPerson";
import Timetable from "@/pages/timetable/Timetable";
import Rooms from "@/pages/rooms/Rooms";
import NewRoom from "@/pages/rooms/NewRoom";
import Reports from "@/pages/reports/Reports";
import Settings from "@/pages/settings/Settings";
import { ElectivesPage } from "@/pages/electives/ElectivesPage";
import NotFound from "./pages/NotFound";
import "./api/msw/browser";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<AppShell />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="courses" element={<Courses />} />
            <Route path="courses/new" element={<NewCourse />} />
            <Route path="courses/edit/:id" element={<EditCourse />} />
            <Route path="courses/edit/subject/:id" element={<EditSubject />} />
            <Route path="people" element={<People />} />
            <Route path="people/new" element={<NewPerson />} />
            <Route path="timetable" element={<Timetable />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="rooms/new" element={<NewRoom />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="electives" element={<ElectivesPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
