/**
 * Frontend Environment Configuration
 * Set these in your .env.local file
 */

// API Configuration
export const API_CONFIG = {
  // Backend API URL - defaults to localhost:8000
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  
  // API version prefix
  apiPrefix: "/api/v1",
  
  // Request timeout in milliseconds
  timeout: 30000,
  
  // Enable request/response logging in development
  debug: process.env.NODE_ENV === "development",
};

// Application Configuration
export const APP_CONFIG = {
  // App name
  name: "Rwanda HR Digital Hub",
  
  // Organization name
  organization: "NCBA Rwanda",
  
  // Default pagination limit
  defaultPageSize: 50,
  
  // Maximum pagination limit
  maxPageSize: 100,
};

// Feature Flags
export const FEATURES = {
  // Organization structure management
  ORGANIZATION_STRUCTURE: true,
  
  // Form management (coming soon)
  FORMS: false,
  
  // Leave tracking (coming soon)
  LEAVE_TRACKING: false,
  
  // Exit forms (coming soon)
  EXIT_FORMS: false,
  
  // Analytics and dashboards (coming soon)
  ANALYTICS: false,
};

// UI Configuration
export const UI_CONFIG = {
  // Theme - "light" | "dark" | "system"
  theme: "system",
  
  // Animation duration in milliseconds
  animationDuration: 300,
  
  // Enable animations
  enableAnimations: true,
};
