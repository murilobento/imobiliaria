# Implementation Plan

- [x] 1. Extend database schema and create user management service functions
  - Add email, is_active, and created_by columns to auth_users table via migration
  - Create database indexes for performance optimization
  - Extend existing auth database service with user management functions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 6.1, 6.4_

- [x] 2. Create user management data types and validation utilities
  - Define extended User interface with new fields (email, is_active, created_by)
  - Create request/response interfaces for user management operations
  - Implement validation functions for username uniqueness, email format, and password strength
  - _Requirements: 1.3, 1.4, 3.3, 3.4, 4.3, 4.4_

- [x] 3. Implement admin user management API endpoints
  - Create GET /api/admin/users route for listing users with pagination and search
  - Create POST /api/admin/users route for user registration by admin
  - Create PATCH /api/admin/users/[id] route for activating/deactivating users
  - Add proper authentication and authorization middleware
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.1, 5.2, 5.3, 6.2, 6.3, 6.4, 6.5_

- [x] 4. Create user profile management API endpoints
  - Create GET /api/user/profile route to fetch current user's profile data
  - Create PATCH /api/user/profile route for updating username and email
  - Create PATCH /api/user/password route for password changes
  - Implement validation for current password verification and uniqueness checks
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Build user registration form component for admin
  - Create UserRegistrationForm component with username, email, password, and confirm password fields
  - Implement client-side validation with real-time feedback
  - Add form submission handling with success/error states
  - Include loading states and proper error display
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 6. Build user management table component for admin
  - Create UserManagementTable component with user listing, search, and pagination
  - Implement user status toggle (active/inactive) with confirmation dialogs
  - Add search functionality with debounced input
  - Include proper loading states and error handling
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7. Create user profile view and edit components
  - Build ProfileView component to display current user data (username, email, created_at)
  - Create ProfileEditForm component with pre-filled current data
  - Implement form validation and submission for profile updates
  - Add cancel functionality to return to view mode
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 8. Build password change component
  - Create PasswordChangeForm component with current password, new password, and confirm fields
  - Implement password strength validation and matching confirmation
  - Add form submission with proper error handling for incorrect current password
  - Include success feedback and form reset after successful change
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 9. Create admin users management page
  - Build /admin/usuarios page that combines registration form and user management table
  - Implement modal or toggle view between registration and user list
  - Add proper page layout with breadcrumbs and navigation
  - Include proper loading states and error boundaries
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 10. Create user profile page
  - Build /admin/perfil page for logged-in user profile management
  - Integrate ProfileView and ProfileEditForm components with toggle functionality
  - Add PasswordChangeForm as separate section or modal
  - Implement proper authentication checks and redirects
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 11. Update navigation and layout components
  - Add "Usuários" menu item to admin sidebar navigation
  - Update TopBar component to include user profile dropdown with "Meu Perfil" link
  - Add proper icons and active state handling for new navigation items
  - Ensure responsive behavior for new navigation elements
  - _Requirements: 5.1, 2.1_

- [x] 12. Write comprehensive unit tests for user management functionality
  - Create tests for all database service functions (user creation, profile updates, password changes)
  - Test API endpoints with various scenarios (success, validation errors, authorization)
  - Write component tests for forms and user interactions
  - Test validation utilities and error handling functions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.1, 6.1, 6.2_

- [x] 13. Create integration tests for complete user management workflows
  - Test complete user registration flow from admin perspective
  - Test user profile editing and password change workflows
  - Test user activation/deactivation functionality
  - Test search and pagination in user management table
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5_