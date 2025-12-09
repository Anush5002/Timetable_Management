# Time Tabling System

A modern, production-ready Time Tabling System built with React, TypeScript, and TailwindCSS. Features role-based access, drag-and-drop timetable editing, conflict detection, and comprehensive course management.

## 🚀 Features

- **Role-Based Dashboard**: Admin, Teacher, Student, and Support Staff views
- **Course Management**: CRUD operations for courses, subjects, and prerequisites  
- **People Management**: Teachers, students, availability, and vacation tracking
- **Interactive Timetable**: Drag-and-drop editing with real-time conflict detection
- **Room & Resource Management**: Capacity, equipment, and utilization tracking
- **Reports & Analytics**: Export timetables, change notifications
- **Settings**: Institution configuration, holidays, exam periods

## 🎨 Design System

- **Theme**: Clean white background with pink brand colors
- **Typography**: Modern, accessible font system
- **Components**: Custom shadcn/ui components with pink theme
- **Responsive**: Mobile-first design with desktop optimization

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS + Custom design tokens
- **UI Components**: shadcn/ui + Lucide icons
- **Routing**: React Router v6
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Testing**: Vitest + Testing Library
- **Mock APIs**: MSW (Mock Service Worker)

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd timetable-system

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run tests
npm run test:ui      # Run tests with UI
```

## 📁 Project Structure

```
src/
├── app/                    # Route components
│   ├── auth/
│   ├── dashboard/
│   ├── courses/
│   ├── people/
│   ├── timetable/
│   ├── rooms/
│   ├── reports/
│   └── settings/
├── components/             # Reusable UI components
│   ├── common/            # General purpose components
│   ├── data/              # Data display components
│   ├── forms/             # Form components
│   ├── timetable/         # Timetable specific components
│   └── ui/                # shadcn/ui components
├── features/              # Feature-specific logic
├── state/                 # Zustand stores
├── api/                   # API layer and MSW mocks
├── types/                 # TypeScript definitions
├── lib/                   # Utility functions
└── styles/               # Global styles
```

## 🎯 Key Components

### Timetable Editor
- **WeekGrid**: Interactive weekly calendar view
- **SlotCard**: Draggable time slot components
- **ConflictDetection**: Real-time validation and warnings

### Data Management
- **DataTable**: Sortable, filterable tables with pagination
- **FormDialog**: Modal forms for CRUD operations
- **AvailabilityEditor**: Teacher schedule management

### Role-Based Features
- **AppShell**: Navigation with role-aware menus
- **Dashboard**: Personalized views per user role
- **Permissions**: Route and feature access control

## 🔧 Configuration

### Environment Variables
```bash
# Development
VITE_API_URL=http://localhost:3001
VITE_MOCK_API=true

# Production
VITE_API_URL=https://your-api-url.com
VITE_MOCK_API=false
```

### Mock Data
The application includes comprehensive mock data for all entities:
- Users (Admin, Teachers, Students, Staff)
- Courses and Subjects
- Rooms and Equipment
- Timetable schedules
- Conflicts and validations

## 🧪 Testing

The project includes unit tests for:
- Conflict detection algorithms
- Data validation functions
- Component rendering
- User interactions

```bash
npm run test           # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
```

## 🚀 Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy the `dist` folder to your hosting provider

## 📝 API Integration

Replace MSW mocks with real API endpoints by:
1. Setting `VITE_MOCK_API=false`
2. Configuring `VITE_API_URL`
3. Implementing authentication tokens
4. Updating API calls in `src/api/`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.